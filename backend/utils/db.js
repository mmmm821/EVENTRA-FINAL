// EVENTRA — lightweight JSON-file "database"
// Swap this module for a real Prisma/PostgreSQL layer in production;
// every controller only talks to readDB()/writeDB() so the storage
// engine can be replaced without touching route/controller code.

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { v4: uuid } = require("uuid");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");

function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function seedIfNeeded() {
  const db = readDB();
  if (db.seeded) return;

  const now = new Date().toISOString();

  const organizer = {
    id: uuid(),
    name: "SRM Tech Club",
    email: "organizer@eventra.dev",
    password: bcrypt.hashSync("password123", 10),
    role: "organizer",
    createdAt: now
  };
  const admin = {
    id: uuid(),
    name: "Platform Admin",
    email: "admin@eventra.dev",
    password: bcrypt.hashSync("password123", 10),
    role: "admin",
    createdAt: now
  };
  const attendee = {
    id: uuid(),
    name: "John Doe",
    email: "attendee@eventra.dev",
    password: bcrypt.hashSync("password123", 10),
    role: "attendee",
    createdAt: now
  };

  db.users.push(organizer, admin, attendee);

  const events = [
    {
      id: uuid(),
      title: "CODESTORM 2026",
      category: "Hackathon",
      organizerId: organizer.id,
      organizerName: "SRM Tech Club",
      venue: "SRM University",
      date: "2026-10-17T09:00:00.000Z",
      description: "A 24-hour hackathon bringing together builders, designers and hackers to ship bold ideas fast.",
      tags: ["Code", "Build", "Compete"],
      image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800",
      status: "approved",
      isLive: true,
      ticketTypes: [
        { id: uuid(), name: "General", price: 299, totalSeats: 300, bookedSeats: 180 }
      ]
    },
    {
      id: uuid(),
      title: "CULTURE FEST 2026",
      category: "Festival",
      organizerId: organizer.id,
      organizerName: "EVENTRA University",
      venue: "Chennai",
      date: "2026-10-24T17:00:00.000Z",
      description: "A vibrant college cultural festival featuring music, dance, art and food — join us for a day full of creativity and fun!",
      tags: ["Music", "Dance", "Food", "Art"],
      image: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800",
      status: "approved",
      isLive: true,
      ticketTypes: [
        { id: uuid(), name: "General", price: 499, totalSeats: 500, bookedSeats: 240 },
        { id: uuid(), name: "VIP", price: 999, totalSeats: 100, bookedSeats: 50 },
        { id: uuid(), name: "Student", price: 299, totalSeats: 200, bookedSeats: 100 }
      ]
    },
    {
      id: uuid(),
      title: "AI INNOVATION SUMMIT",
      category: "Summit",
      organizerId: organizer.id,
      organizerName: "Tech Innovators",
      venue: "Chennai Trade Centre",
      date: "2026-11-07T10:00:00.000Z",
      description: "Industry leaders and researchers explore the frontier of applied AI across products, research and policy.",
      tags: ["AI", "Talks", "Networking"],
      image: "https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800",
      status: "approved",
      isLive: false,
      ticketTypes: [
        { id: uuid(), name: "General", price: 799, totalSeats: 250, bookedSeats: 90 }
      ]
    },
    {
      id: uuid(),
      title: "FULL STACK WORKSHOP",
      category: "Workshop",
      organizerId: organizer.id,
      organizerName: "Coding Community",
      venue: "CB Block, SRM",
      date: "2026-11-14T09:30:00.000Z",
      description: "Hands-on full-stack workshop covering React, Node.js and deployment, for beginners and intermediate builders alike.",
      tags: ["React", "Node.js", "Hands-on"],
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800",
      status: "approved",
      isLive: false,
      ticketTypes: [
        { id: uuid(), name: "General", price: 199, totalSeats: 120, bookedSeats: 60 }
      ]
    }
  ];

  db.events.push(...events);
  db.seeded = true;
  writeDB(db);
  console.log("Database seeded with demo users and events.");
  console.log("  Attendee login: attendee@eventra.dev / password123");
  console.log("  Organizer login: organizer@eventra.dev / password123");
  console.log("  Admin login:     admin@eventra.dev / password123");
}

module.exports = { readDB, writeDB, seedIfNeeded, uuid };
