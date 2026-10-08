const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { verifyTicketToken } = require("../utils/qr");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

exports.mine = async (req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ tickets });
  } catch (error) {
    console.error("Get tickets error:", error);
    res.status(500).json({
      message: "Failed to load tickets.",
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found.",
      });
    }

    if (ticket.userId !== req.user.id) {
      return res.status(403).json({
        message: "Not your ticket.",
      });
    }

    res.json({ ticket });
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({
      message: "Failed to load ticket.",
    });
  }
};

// POST /api/tickets/verify
exports.verify = async (req, res) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({
        valid: false,
        message: "Provide a ticket ID or scanned QR value.",
      });
    }

    let ticket = null;
    const trimmedInput = input.trim();

    // Try signed QR token first
    try {
      const payload = verifyTicketToken(trimmedInput);

      ticket = await prisma.ticket.findUnique({
        where: {
          id: payload.ticketId,
        },
      });
    } catch (error) {
      // Fall back to ticket ID
      ticket = await prisma.ticket.findFirst({
        where: {
          OR: [
            {
              id: trimmedInput,
            },
            {
              id: {
                startsWith: trimmedInput,
              },
            },
          ],
        },
      });
    }

    if (!ticket) {
      return res.status(404).json({
        valid: false,
        message: "Ticket not found or QR is invalid/tampered.",
      });
    }

    // Atomically check in the ticket
    const updated = await prisma.ticket.updateMany({
      where: {
        id: ticket.id,
        checkedIn: false,
      },
      data: {
        checkedIn: true,
        checkedInAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      const currentTicket = await prisma.ticket.findUnique({
        where: {
          id: ticket.id,
        },
      });

      return res.status(409).json({
        valid: false,
        message: "This ticket has already been checked in.",
        checkedInAt: currentTicket?.checkedInAt || null,
      });
    }

    const checkedTicket = await prisma.ticket.findUnique({
      where: {
        id: ticket.id,
      },
    });

    const attendee = await prisma.user.findUnique({
      where: {
        id: checkedTicket.userId,
      },
      select: {
        name: true,
      },
    });

    res.json({
      valid: true,
      message: "Valid ticket. Entry granted.",
      ticket: {
        id: checkedTicket.id,
        eventTitle: checkedTicket.eventTitle,
        ticketTypeName: checkedTicket.ticketTypeName,
        checkedInAt: checkedTicket.checkedInAt,
        attendeeName: attendee ? attendee.name : "Unknown",
      },
    });
  } catch (error) {
    console.error("Verify ticket error:", error);

    res.status(500).json({
      valid: false,
      message: "Failed to verify ticket.",
    });
  }
};