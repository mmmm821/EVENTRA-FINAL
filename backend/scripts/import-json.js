require("dotenv").config();

const { PrismaClient } = require("../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const db = require("../data/db.json");

function toDate(value) {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

async function main() {
  console.log("Starting JSON → PostgreSQL import...\n");

  // USERS
  console.log(`Importing ${db.users?.length || 0} users...`);

  for (const user of db.users || []) {
    const data = {
      id: String(user.id),
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      suspended: Boolean(user.suspended),
    };

    const createdAt = toDate(user.createdAt);

    if (createdAt) {
      data.createdAt = createdAt;
    }

    await prisma.user.upsert({
      where: { id: String(user.id) },
      update: data,
      create: data,
    });
  }

  // EVENTS
  console.log(`Importing ${db.events?.length || 0} events...`);

  for (const event of db.events || []) {
    await prisma.event.upsert({
      where: { id: String(event.id) },
      update: {
        title: event.title,
        category: event.category,
        organizerId: String(event.organizerId),
        organizerName: event.organizerName,
        venue: event.venue,
        date: toDate(event.date),
        description: event.description || "",
        tags: Array.isArray(event.tags)
          ? event.tags.map(String)
          : [],
        image: event.image || "",
        status: event.status,
        isLive: Boolean(event.isLive),
      },
      create: {
        id: String(event.id),
        title: event.title,
        category: event.category,
        organizerId: String(event.organizerId),
        organizerName: event.organizerName,
        venue: event.venue,
        date: toDate(event.date),
        description: event.description || "",
        tags: Array.isArray(event.tags)
          ? event.tags.map(String)
          : [],
        image: event.image || "",
        status: event.status,
        isLive: Boolean(event.isLive),
      },
    });

    // TICKET TYPES
    for (const ticketType of event.ticketTypes || []) {
      await prisma.ticketType.upsert({
        where: {
          id: String(ticketType.id),
        },
        update: {
          eventId: String(event.id),
          name: ticketType.name,
          price: Number(ticketType.price),
          totalSeats: Number(ticketType.totalSeats),
          bookedSeats: Number(ticketType.bookedSeats || 0),
        },
        create: {
          id: String(ticketType.id),
          eventId: String(event.id),
          name: ticketType.name,
          price: Number(ticketType.price),
          totalSeats: Number(ticketType.totalSeats),
          bookedSeats: Number(ticketType.bookedSeats || 0),
        },
      });
    }
  }

  // FAVORITES
  console.log("Importing favorites...");

  for (const user of db.users || []) {
    for (const eventId of user.favorites || []) {
      await prisma.favorite.upsert({
        where: {
          userId_eventId: {
            userId: String(user.id),
            eventId: String(eventId),
          },
        },
        update: {},
        create: {
          userId: String(user.id),
          eventId: String(eventId),
        },
      });
    }
  }

  // BOOKINGS
  console.log(`Importing ${db.bookings?.length || 0} bookings...`);

  for (const booking of db.bookings || []) {
    const bookingData = {
      id: String(booking.id),
      eventId: String(booking.eventId),
      userId: String(booking.userId),
      amount: Number(booking.amount),
      status: booking.status,
    };

    const createdAt = toDate(booking.createdAt);
    const paidAt = toDate(booking.paidAt);

    if (createdAt) bookingData.createdAt = createdAt;
    if (paidAt) bookingData.paidAt = paidAt;

    if (booking.paymentId) {
      bookingData.paymentId = String(booking.paymentId);
    }

    await prisma.booking.upsert({
      where: {
        id: String(booking.id),
      },
      update: bookingData,
      create: bookingData,
    });

    // BOOKING ITEMS
    for (let i = 0; i < (booking.items || []).length; i++) {
      const item = booking.items[i];

      const itemId = `${booking.id}-${item.ticketTypeId}-${i}`;

      await prisma.bookingItem.upsert({
        where: {
          id: itemId,
        },
        update: {
          bookingId: String(booking.id),
          ticketTypeId: String(item.ticketTypeId),
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
        },
        create: {
          id: itemId,
          bookingId: String(booking.id),
          ticketTypeId: String(item.ticketTypeId),
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
        },
      });
    }
  }

  // TICKETS
  console.log(`Importing ${db.tickets?.length || 0} tickets...`);

  for (const ticket of db.tickets || []) {
    const ticketData = {
      id: String(ticket.id),
      bookingId: String(ticket.bookingId),
      eventId: String(ticket.eventId),
      eventTitle: ticket.eventTitle,
      userId: String(ticket.userId),
      ticketTypeName: ticket.ticketTypeName,
      price: Number(ticket.price),
      token: String(ticket.token),
      qrDataUrl: ticket.qrDataUrl || null,
      checkedIn: Boolean(ticket.checkedIn),
      checkedInAt: toDate(ticket.checkedInAt) || null,
    };

    const createdAt = toDate(ticket.createdAt);

    if (createdAt) {
      ticketData.createdAt = createdAt;
    }

    await prisma.ticket.upsert({
      where: {
        id: String(ticket.id),
      },
      update: ticketData,
      create: ticketData,
    });
  }

  console.log("\n✅ JSON → PostgreSQL import completed successfully!");

  const counts = await Promise.all([
    prisma.user.count(),
    prisma.event.count(),
    prisma.ticketType.count(),
    prisma.favorite.count(),
    prisma.booking.count(),
    prisma.bookingItem.count(),
    prisma.ticket.count(),
  ]);

  console.log("\nPostgreSQL counts:");
  console.log({
    users: counts[0],
    events: counts[1],
    ticketTypes: counts[2],
    favorites: counts[3],
    bookings: counts[4],
    bookingItems: counts[5],
    tickets: counts[6],
  });
}

main()
  .catch((error) => {
    console.error("\n❌ Import failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });