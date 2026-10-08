const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { uuid } = require("../utils/db");
const { signTicketToken, generateQRDataUrl } = require("../utils/qr");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// POST /api/bookings
exports.create = async (req, res) => {
  try {
    const { eventId, items = [] } = req.body;

    if (!eventId || !items.length) {
      return res.status(400).json({
        message: "eventId and at least one ticket item are required.",
      });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        include: {
          ticketTypes: true,
        },
      });

      if (!event) {
        const error = new Error("Event not found.");
        error.status = 404;
        throw error;
      }

      let amount = 0;
      const resolvedItems = [];

      for (const item of items) {
        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
          const error = new Error("Invalid ticket quantity.");
          error.status = 400;
          throw error;
        }

        const type = event.ticketTypes.find(
          (t) => t.id === String(item.ticketTypeId)
        );

        if (!type) {
          const error = new Error("Invalid ticket type.");
          error.status = 400;
          throw error;
        }

        const left = type.totalSeats - type.bookedSeats;

        if (quantity > left) {
          const error = new Error(
            `Only ${left} "${type.name}" seat(s) left.`
          );
          error.status = 409;
          throw error;
        }

        // Atomic inventory update
        const updatedType = await tx.ticketType.updateMany({
          where: {
            id: type.id,
            bookedSeats: {
              lte: type.totalSeats - quantity,
            },
          },
          data: {
            bookedSeats: {
              increment: quantity,
            },
          },
        });

        if (updatedType.count !== 1) {
          const error = new Error(
            `Only ${left} "${type.name}" seat(s) left.`
          );
          error.status = 409;
          throw error;
        }

        amount += type.price * quantity;

        resolvedItems.push({
          ticketTypeId: type.id,
          name: type.name,
          price: type.price,
          quantity,
        });
      }

      const createdBooking = await tx.booking.create({
        data: {
          id: uuid(),
          eventId,
          userId: req.user.id,
          amount,
          status: "pending_payment",

          items: {
            create: resolvedItems.map((item) => ({
              id: uuid(),
              ticketTypeId: item.ticketTypeId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
        },

        include: {
          items: true,
          event: true,
        },
      });

      return createdBooking;
    });

    res.status(201).json({
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    res.status(error.status || 500).json({
      message: error.status ? error.message : "Failed to create booking.",
    });
  }
};


// POST /api/bookings/:id/pay
exports.pay = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const existingBooking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        items: true,
        event: true,
      },
    });

    if (!existingBooking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    if (existingBooking.userId !== req.user.id) {
      return res.status(403).json({
        message: "Not your booking.",
      });
    }

    if (existingBooking.status !== "pending_payment") {
      return res.status(409).json({
        message: `Booking is already ${existingBooking.status}.`,
      });
    }

    const paymentId =
      req.body.razorpayPaymentId ||
      `pay_test_${uuid().slice(0, 12)}`;

    const ticketsToCreate = [];

    for (const item of existingBooking.items) {
      for (let i = 0; i < item.quantity; i++) {
        const ticketId = uuid();
        const token = signTicketToken(
          ticketId,
          existingBooking.eventId
        );

        const qrDataUrl = await generateQRDataUrl(token);

        ticketsToCreate.push({
          id: ticketId,
          bookingId: existingBooking.id,
          eventId: existingBooking.eventId,
          eventTitle: existingBooking.event.title,
          userId: req.user.id,
          ticketTypeName: item.name,
          price: item.price,
          token,
          qrDataUrl,
          checkedIn: false,
        });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.updateMany({
        where: {
          id: bookingId,
          userId: req.user.id,
          status: "pending_payment",
        },
        data: {
          status: "confirmed",
          paymentId,
          paidAt: new Date(),
        },
      });

      if (booking.count !== 1) {
        const error = new Error(
          "Booking has already been processed."
        );
        error.status = 409;
        throw error;
      }

      await tx.ticket.createMany({
        data: ticketsToCreate,
      });

      return tx.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          items: true,
          tickets: true,
          event: true,
        },
      });
    });

    res.json({
      booking: result,
      tickets: result.tickets,
      message: "Payment verified. Digital tickets issued.",
    });
  } catch (error) {
    console.error("Payment error:", error);

    res.status(error.status || 500).json({
      message: error.status
        ? error.message
        : "Payment processing failed.",
    });
  }
};


// PATCH /api/bookings/:id/cancel
exports.cancel = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        items: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        message: "Not your booking.",
      });
    }

    if (booking.status !== "pending_payment") {
      return res.status(409).json({
        message: "Only unpaid bookings can be cancelled.",
      });
    }

    const updatedBooking = await prisma.$transaction(async (tx) => {
      for (const item of booking.items) {
        await tx.ticketType.updateMany({
          where: {
            id: item.ticketTypeId,
            bookedSeats: {
              gte: item.quantity,
            },
          },
          data: {
            bookedSeats: {
              decrement: item.quantity,
            },
          },
        });
      }

      return tx.booking.updateMany({
        where: {
          id: booking.id,
          userId: req.user.id,
          status: "pending_payment",
        },
        data: {
          status: "cancelled",
        },
      });
    });

    if (updatedBooking.count !== 1) {
      return res.status(409).json({
        message: "Booking could not be cancelled.",
      });
    }

    const finalBooking = await prisma.booking.findUnique({
      where: {
        id: booking.id,
      },
      include: {
        items: true,
      },
    });

    res.json({
      booking: finalBooking,
    });
  } catch (error) {
    console.error("Cancel booking error:", error);

    res.status(500).json({
      message: "Failed to cancel booking.",
    });
  }
};


// GET /api/bookings/mine
exports.mine = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        items: true,
        event: true,
        tickets: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);

    res.status(500).json({
      message: "Failed to load bookings.",
    });
  }
};


// GET /api/bookings/:id
exports.getById = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        items: true,
        event: true,
        tickets: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found.",
      });
    }

    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        message: "Not your booking.",
      });
    }

    res.json({
      booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);

    res.status(500).json({
      message: "Failed to load booking.",
    });
  }
};