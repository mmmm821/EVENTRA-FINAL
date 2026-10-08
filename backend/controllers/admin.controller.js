const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// GET /api/admin/stats
exports.stats = async (req, res) => {
  try {
    const totalUsers = await prisma.user.count({
      where: {
        role: {
          not: "admin",
        },
      },
    });

    const totalEvents = await prisma.event.count();

    const confirmedBookings = await prisma.booking.findMany({
      where: {
        status: "confirmed",
      },
      select: {
        amount: true,
      },
    });

    const totalRevenue = confirmedBookings.reduce(
      (sum, booking) => sum + booking.amount,
      0
    );

    const totalCheckIns = await prisma.ticket.count({
      where: {
        checkedIn: true,
      },
    });

    res.json({
      stats: {
        totalUsers,
        totalEvents,
        totalRevenue,
        totalCheckIns,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    res.status(500).json({
      message: "Failed to load admin statistics.",
    });
  }
};

// GET /api/admin/events
exports.listEvents = async (req, res) => {
  try {
    const { status } = req.query;

    const events = await prisma.event.findMany({
      where: status
        ? {
            status,
          }
        : undefined,
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
    console.error("Admin events error:", error);

    res.status(500).json({
      message: "Failed to load events.",
    });
  }
};

// PATCH /api/admin/events/:id/status
// { status: "approved" | "rejected" | "cancelled" }
exports.setEventStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["approved", "rejected", "cancelled"].includes(status)) {
      return res.status(400).json({
        message:
          "status must be approved, rejected or cancelled.",
      });
    }

    const existingEvent = await prisma.event.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existingEvent) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    const event = await prisma.event.update({
      where: {
        id: req.params.id,
      },
      data: {
        status,
        isLive: status === "approved",
      },
      include: {
        ticketTypes: true,
      },
    });

    res.json({
      event,
    });
  } catch (error) {
    console.error("Set event status error:", error);

    res.status(500).json({
      message: "Failed to update event status.",
    });
  }
};

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: "admin",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        suspended: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      users,
    });
  } catch (error) {
    console.error("Admin users error:", error);

    res.status(500).json({
      message: "Failed to load users.",
    });
  }
};

// PATCH /api/admin/users/:id/suspend
// { suspended: true | false }
exports.suspendUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const suspended = !!req.body.suspended;

    await prisma.user.update({
      where: {
        id: req.params.id,
      },
      data: {
        suspended,
      },
    });

    res.json({
      message: `User ${
        suspended ? "suspended" : "reinstated"
      }.`,
    });
  } catch (error) {
    console.error("Suspend user error:", error);

    res.status(500).json({
      message: "Failed to update user status.",
    });
  }
};

// GET /api/admin/transactions
exports.transactions = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: "confirmed",
      },
      include: {
        event: true,
        user: true,
      },
      orderBy: {
        paidAt: "desc",
      },
    });

    const transactions = bookings.map((booking) => ({
      id: booking.id,
      eventTitle: booking.event
        ? booking.event.title
        : "Unknown event",
      userName: booking.user
        ? booking.user.name
        : "Unknown user",
      amount: booking.amount,
      paymentId: booking.paymentId,
      paidAt: booking.paidAt,
    }));

    res.json({
      transactions,
    });
  } catch (error) {
    console.error("Admin transactions error:", error);

    res.status(500).json({
      message: "Failed to load transactions.",
    });
  }
};