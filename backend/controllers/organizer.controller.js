const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// GET /api/organizer/dashboard
exports.dashboard = async (req, res) => {
  try {
    const myEvents = await prisma.event.findMany({
      where: {
        organizerId: req.user.id,
      },
      include: {
        ticketTypes: true,
        tickets: true,
        bookings: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    const myEventIds = myEvents.map((event) => event.id);

    const myBookings = await prisma.booking.findMany({
      where: {
        eventId: {
          in: myEventIds,
        },
        status: "confirmed",
      },
    });

    const myTickets = await prisma.ticket.findMany({
      where: {
        eventId: {
          in: myEventIds,
        },
      },
    });

    const totalEvents = myEvents.length;

    const ticketsSold = myTickets.length;

    const revenue = myBookings.reduce(
      (sum, booking) => sum + booking.amount,
      0
    );

    const qrCheckIns = myTickets.filter(
      (ticket) => ticket.checkedIn
    ).length;

    const recentEvents = myEvents
      .slice(0, 5)
      .map((event) => {
        const sold = myTickets.filter(
          (ticket) => ticket.eventId === event.id
        ).length;

        const capacity = event.ticketTypes.reduce(
          (sum, ticketType) => sum + ticketType.totalSeats,
          0
        );

        return {
          id: event.id,
          title: event.title,
          date: event.date,
          sold,
          capacity,
          status: event.status,
        };
      });

    res.json({
      stats: {
        totalEvents,
        ticketsSold,
        revenue,
        qrCheckIns,
      },
      recentEvents,
    });
  } catch (error) {
    console.error("Organizer dashboard error:", error);

    res.status(500).json({
      message: "Failed to load organizer dashboard.",
    });
  }
};

// GET /api/organizer/events
exports.myEvents = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        organizerId: req.user.id,
      },
      include: {
        ticketTypes: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    res.json({
      events,
    });
  } catch (error) {
    console.error("Organizer events error:", error);

    res.status(500).json({
      message: "Failed to load organizer events.",
    });
  }
};