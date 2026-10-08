const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { uuid } = require("../utils/db");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function withComputed(event, favoriteIds = []) {
  const ticketTypes = event.ticketTypes || [];

  const minPrice = ticketTypes.length
    ? Math.min(...ticketTypes.map((t) => t.price))
    : 0;

  const seatsLeft = ticketTypes.reduce(
    (sum, t) => sum + (t.totalSeats - t.bookedSeats),
    0
  );

  const totalSeats = ticketTypes.reduce(
    (sum, t) => sum + t.totalSeats,
    0
  );

  return {
    ...event,
    minPrice,
    seatsLeft,
    totalSeats,
    isFavorite: favoriteIds.includes(event.id),
  };
}

// GET /api/events
exports.list = async (req, res) => {
  try {
    const {
      search = "",
      category = "all",
      sort = "date",
      page = 1,
      limit = 8,
    } = req.query;

    const where = {
      status: "approved",
    };

    if (category && category !== "all") {
      where.category = {
        equals: category,
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          venue: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          organizerName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        ticketTypes: true,
      },
      orderBy:
        sort === "price"
          ? {
              ticketTypes: {
                _count: "asc",
              },
            }
          : {
              date: "asc",
            },
    });

    const favoriteIds = req.favoriteIds || [];

    const total = events.length;
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const start = (pageNumber - 1) * limitNumber;

    const paged = events
      .slice(start, start + limitNumber)
      .map((event) => withComputed(event, favoriteIds));

    res.json({
      total,
      page: pageNumber,
      limit: limitNumber,
      events: paged,
    });
  } catch (error) {
    console.error("List events error:", error);
    res.status(500).json({
      message: "Failed to load events.",
    });
  }
};

exports.categories = async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    const cats = events.map((e) => e.category);

    res.json({
      categories: ["All", ...cats],
    });
  } catch (error) {
    console.error("Categories error:", error);
    res.status(500).json({
      message: "Failed to load categories.",
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        ticketTypes: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    const favoriteIds = req.favoriteIds || [];

    res.json({
      event: withComputed(event, favoriteIds),
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      message: "Failed to load event.",
    });
  }
};

// POST /api/events
exports.create = async (req, res) => {
  try {
    const {
      title,
      category,
      venue,
      date,
      description,
      tags = [],
      image,
      ticketTypes = [],
    } = req.body;

    if (!title || !category || !venue || !date || !ticketTypes.length) {
      return res.status(400).json({
        message:
          "Title, category, venue, date and at least one ticket type are required.",
      });
    }

    const event = await prisma.event.create({
      data: {
        id: uuid(),
        title,
        category,
        organizerId: req.user.id,
        organizerName: req.user.name,
        venue,
        date: new Date(date),
        description: description || "",
        tags: Array.isArray(tags) ? tags.map(String) : [],
        image:
          image ||
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
        status: "pending",
        isLive: false,

        ticketTypes: {
          create: ticketTypes.map((t) => ({
            id: uuid(),
            name: t.name,
            price: Number(t.price),
            totalSeats: Number(t.totalSeats),
            bookedSeats: 0,
          })),
        },
      },

      include: {
        ticketTypes: true,
      },
    });

    res.status(201).json({
      event: withComputed(event),
      message: "Event submitted for admin approval.",
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({
      message: "Failed to create event.",
    });
  }
};

// PUT /api/events/:id
exports.update = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        ticketTypes: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    if (event.organizerId !== req.user.id) {
      return res.status(403).json({
        message: "You can only edit your own events.",
      });
    }

    const data = {};

    const editable = [
      "title",
      "category",
      "venue",
      "description",
      "tags",
      "image",
    ];

    editable.forEach((field) => {
      if (req.body[field] !== undefined) {
        data[field] =
          field === "tags" && Array.isArray(req.body[field])
            ? req.body[field].map(String)
            : req.body[field];
      }
    });

    if (req.body.date !== undefined) {
      data.date = new Date(req.body.date);
    }

    const updated = await prisma.event.update({
      where: {
        id: req.params.id,
      },
      data,
      include: {
        ticketTypes: true,
      },
    });

    res.json({
      event: withComputed(updated),
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      message: "Failed to update event.",
    });
  }
};

// PATCH /api/events/:id/cancel
exports.cancel = async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    if (event.organizerId !== req.user.id) {
      return res.status(403).json({
        message: "You can only cancel your own events.",
      });
    }

    const updated = await prisma.event.update({
      where: {
        id: req.params.id,
      },
      data: {
        status: "cancelled",
      },
      include: {
        ticketTypes: true,
      },
    });

    res.json({
      event: withComputed(updated),
      message: "Event cancelled.",
    });
  } catch (error) {
    console.error("Cancel event error:", error);
    res.status(500).json({
      message: "Failed to cancel event.",
    });
  }
};

// PATCH /api/events/:id/favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found.",
      });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_eventId: {
          userId: req.user.id,
          eventId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: {
          id: existing.id,
        },
      });
    } else {
      await prisma.favorite.create({
        data: {
          userId: req.user.id,
          eventId,
        },
      });
    }

    const favorites = await prisma.favorite.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        eventId: true,
      },
    });

    res.json({
      favorites: favorites.map((f) => f.eventId),
    });
  } catch (error) {
    console.error("Toggle favorite error:", error);
    res.status(500).json({
      message: "Failed to update favorites.",
    });
  }
};

exports.myFavorites = async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        event: {
          include: {
            ticketTypes: true,
          },
        },
      },
    });

    const favoriteIds = favorites.map((f) => f.eventId);

    const events = favorites.map((f) =>
      withComputed(f.event, favoriteIds)
    );

    res.json({
      events,
    });
  } catch (error) {
    console.error("My favorites error:", error);
    res.status(500).json({
      message: "Failed to load favorites.",
    });
  }
};

// Middleware
exports.attachFavorites = async (req, res, next) => {
  req.favoriteIds = [];

  const header = req.headers.authorization || "";

  if (header.startsWith("Bearer ")) {
    try {
      const { verifyToken } = require("../utils/jwt");

      const payload = verifyToken(header.slice(7));

      const favorites = await prisma.favorite.findMany({
        where: {
          userId: payload.id,
        },
        select: {
          eventId: true,
        },
      });

      req.favoriteIds = favorites.map((f) => f.eventId);
    } catch (error) {
      // Guest or expired token
      req.favoriteIds = [];
    }
  }

  next();
};
