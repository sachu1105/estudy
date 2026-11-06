/**
 * Demo items for the Store, so it isn't empty on a fresh database: four sample practice
 * papers (real PDFs, with keys) owned by the super admin, listed as five Store items:
 * free, paid, in a plan, and one bundle of all four. Safe to run again: it skips what's
 * there.
 *
 *   pnpm demo:store            add them
 *   pnpm demo:store --remove   take them out of the Store (buyers keep what they have)
 *
 * The questions are written for practice, not taken from any exam, and the key is ours
 * (keySource OWN): nothing here claims to be an official paper or key.
 */
import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";

import type { Plan } from "@/server/db/generated/prisma/client";

import { systemClock } from "@/lib/clock";
import { prisma } from "@/server/db";
import { env } from "@/server/env";
import { bundleRepository } from "@/server/repositories/bundle-repository";
import { storage } from "@/server/storage";

type Q = [
  question: string,
  options: [string, string, string, string],
  answer: 0 | 1 | 2 | 3,
];

const PAPERS: { title: string; minutes: number; questions: Q[] }[] = [
  {
    title: "Sample general knowledge set 1",
    minutes: 15,
    questions: [
      [
        "What is the capital of Kerala?",
        ["Kochi", "Thiruvananthapuram", "Kozhikode", "Thrissur"],
        1,
      ],
      [
        "What is the national animal of India?",
        ["Lion", "Elephant", "Tiger", "Peacock"],
        2,
      ],
      [
        "Which is the longest river in India?",
        ["Ganga", "Godavari", "Yamuna", "Narmada"],
        0,
      ],
      [
        "Who wrote 'Jana Gana Mana'?",
        [
          "Bankim Chandra Chatterjee",
          "Rabindranath Tagore",
          "Sarojini Naidu",
          "Muhammad Iqbal",
        ],
        1,
      ],
      ["How many states does India have?", ["26", "28", "29", "30"], 1],
      [
        "Who was the first Prime Minister of India?",
        [
          "Jawaharlal Nehru",
          "Lal Bahadur Shastri",
          "Indira Gandhi",
          "Morarji Desai",
        ],
        0,
      ],
      [
        "Which planet is known as the Red Planet?",
        ["Venus", "Jupiter", "Mars", "Saturn"],
        2,
      ],
      [
        "When did the Constitution of India come into force?",
        [
          "15 August 1947",
          "26 January 1950",
          "26 November 1949",
          "2 October 1950",
        ],
        1,
      ],
      [
        "Which is the largest state of India by area?",
        ["Madhya Pradesh", "Maharashtra", "Rajasthan", "Uttar Pradesh"],
        2,
      ],
      ["What is the currency of Japan?", ["Won", "Yuan", "Yen", "Ringgit"], 2],
      ["What is the chemical symbol of gold?", ["Ag", "Au", "Gd", "Go"], 1],
      [
        "Which gas do plants take in for photosynthesis?",
        ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
        2,
      ],
      [
        "Who is called the Father of the Nation in India?",
        [
          "Subhas Chandra Bose",
          "Mahatma Gandhi",
          "B R Ambedkar",
          "Sardar Patel",
        ],
        1,
      ],
      ["How many districts does Kerala have?", ["12", "13", "14", "15"], 2],
      [
        "Which is the highest peak in South India?",
        ["Doddabetta", "Anamudi", "Agasthyamala", "Meesapulimala"],
        1,
      ],
    ],
  },
  {
    title: "Sample Kerala special set",
    minutes: 15,
    questions: [
      [
        "When was the state of Kerala formed?",
        [
          "1 November 1956",
          "26 January 1950",
          "15 August 1947",
          "1 November 1957",
        ],
        0,
      ],
      [
        "Which is the longest river in Kerala?",
        ["Bharathapuzha", "Pamba", "Periyar", "Chaliyar"],
        2,
      ],
      [
        "Who was the first Chief Minister of Kerala?",
        [
          "Pattom Thanu Pillai",
          "E M S Namboodiripad",
          "R Sankar",
          "C Achutha Menon",
        ],
        1,
      ],
      [
        "What is the state bird of Kerala?",
        ["Peacock", "Great hornbill", "Kingfisher", "Myna"],
        1,
      ],
      [
        "Silent Valley National Park is in which district?",
        ["Wayanad", "Idukki", "Palakkad", "Malappuram"],
        2,
      ],
      [
        "Who founded the SNDP Yogam?",
        [
          "Chattampi Swamikal",
          "Sree Narayana Guru",
          "Ayyankali",
          "Mannathu Padmanabhan",
        ],
        1,
      ],
      [
        "In which year did the Vaikom Satyagraha begin?",
        ["1921", "1924", "1931", "1936"],
        1,
      ],
      [
        "What is the state animal of Kerala?",
        ["Tiger", "Elephant", "Nilgiri tahr", "Gaur"],
        1,
      ],
      [
        "What is the state flower of Kerala?",
        ["Lotus", "Kanikkonna", "Jasmine", "Hibiscus"],
        1,
      ],
      [
        "In which year was the Temple Entry Proclamation made in Travancore?",
        ["1924", "1931", "1936", "1947"],
        2,
      ],
      [
        "Who founded the Sadhu Jana Paripalana Sangham?",
        ["Ayyankali", "Pandit Karuppan", "Vagbhatananda", "Poykayil Appachan"],
        0,
      ],
      [
        "The Mullaperiyar dam is built across which river?",
        ["Pamba", "Periyar", "Bharathapuzha", "Kabini"],
        1,
      ],
      [
        "Which was the capital of Travancore before Thiruvananthapuram?",
        ["Kollam", "Padmanabhapuram", "Kayamkulam", "Attingal"],
        1,
      ],
      [
        "Which is the highest peak in Kerala?",
        ["Agasthyamala", "Chembra", "Anamudi", "Ponmudi"],
        2,
      ],
      [
        "The Periyar Tiger Reserve at Thekkady is in which district?",
        ["Idukki", "Pathanamthitta", "Kottayam", "Ernakulam"],
        0,
      ],
    ],
  },
  {
    title: "Sample maths and reasoning set",
    minutes: 20,
    questions: [
      ["What is 25% of 480?", ["100", "120", "140", "160"], 1],
      ["What comes next: 2, 6, 12, 20, 30, ?", ["40", "42", "44", "36"], 1],
      [
        "Simple interest on Rs. 5000 at 8% a year for 3 years is",
        ["Rs. 1000", "Rs. 1100", "Rs. 1200", "Rs. 1300"],
        2,
      ],
      [
        "What is the average of 12, 18, 24 and 30?",
        ["20", "21", "22", "24"],
        1,
      ],
      ["What is the LCM of 12 and 18?", ["36", "54", "72", "6"], 0],
      [
        "A 120 m train at 36 km/h passes a pole in how many seconds?",
        ["10", "12", "15", "20"],
        1,
      ],
      [
        "If CAT is written DBU, how is DOG written?",
        ["EPH", "CNF", "EOH", "DPH"],
        0,
      ],
      ["What is the square root of 1764?", ["38", "42", "44", "48"], 1],
      ["What is 3/4 of 2/3 of 120?", ["40", "60", "80", "90"], 1],
      [
        "Split 64 in the ratio 3 : 5. The larger part is",
        ["24", "36", "40", "44"],
        2,
      ],
      [
        "Which is the odd one out: 8, 27, 64, 100, 125?",
        ["27", "64", "100", "125"],
        2,
      ],
      [
        "What is the angle between the clock hands at 3:00?",
        ["60 degrees", "90 degrees", "120 degrees", "180 degrees"],
        1,
      ],
      [
        "A price rises 20% and then falls 20%. The net change is",
        ["No change", "4% rise", "4% fall", "2% fall"],
        2,
      ],
      [
        "If today is Monday, which day is it 15 days from now?",
        ["Monday", "Tuesday", "Wednesday", "Sunday"],
        1,
      ],
      ["What is 0.2 x 0.3?", ["0.6", "0.06", "0.006", "6"], 1],
    ],
  },
  {
    title: "Sample polity and science set",
    minutes: 15,
    questions: [
      [
        "Who is the supreme commander of India's armed forces?",
        [
          "Prime Minister",
          "President",
          "Defence Minister",
          "Chief of Defence Staff",
        ],
        1,
      ],
      [
        "Article 17 of the Constitution abolishes",
        ["Titles", "Untouchability", "Child labour", "Begar"],
        1,
      ],
      [
        "What is the minimum age to become President of India?",
        ["25", "30", "35", "40"],
        2,
      ],
      [
        "What is the normal term of the Lok Sabha?",
        ["4 years", "5 years", "6 years", "7 years"],
        1,
      ],
      [
        "Who chairs the Rajya Sabha?",
        ["President", "Speaker", "Vice-President", "Prime Minister"],
        2,
      ],
      [
        "Fundamental Duties were added by which amendment?",
        ["42nd", "44th", "52nd", "61st"],
        0,
      ],
      [
        "What is the unit of electric current?",
        ["Volt", "Ohm", "Ampere", "Watt"],
        2,
      ],
      [
        "Which vitamin does the skin make in sunlight?",
        ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin K"],
        2,
      ],
      [
        "What is the hardest natural substance?",
        ["Iron", "Diamond", "Quartz", "Graphite"],
        1,
      ],
      [
        "Roughly how fast does light travel?",
        ["3 x 10^6 m/s", "3 x 10^8 m/s", "3 x 10^10 m/s", "3 x 10^5 m/s"],
        1,
      ],
      ["What is the pH of pure water?", ["0", "5", "7", "14"], 2],
      [
        "Which organ makes insulin?",
        ["Liver", "Pancreas", "Kidney", "Thyroid"],
        1,
      ],
      [
        "Who chaired the Drafting Committee of the Constitution?",
        ["Rajendra Prasad", "B R Ambedkar", "Jawaharlal Nehru", "Sardar Patel"],
        1,
      ],
      [
        "Which part of the Constitution holds the Fundamental Rights?",
        ["Part II", "Part III", "Part IV", "Part V"],
        1,
      ],
      ["Which blood group is the universal donor?", ["A", "B", "AB", "O"], 3],
    ],
  },
];

/** The Store items, by the papers they hold (indexes into PAPERS). */
const ITEMS: {
  title: string;
  description: string;
  papers: number[];
  rupees: number | null;
  includedIn: Plan[];
}[] = [
  {
    title: "Sample prelims bundle: 4 sets",
    description:
      "All four sample sets: general knowledge, Kerala, maths and reasoning, polity and science. 60 questions with keys.",
    papers: [0, 1, 2, 3],
    rupees: 149,
    includedIn: ["ELITE"],
  },
  {
    title: "Sample general knowledge set 1",
    description:
      "15 general knowledge questions to try the OMR sheet and timer.",
    papers: [0],
    rupees: null,
    includedIn: [],
  },
  {
    title: "Sample Kerala special set",
    description:
      "15 questions on Kerala: its history, geography and renaissance.",
    papers: [1],
    rupees: 49,
    includedIn: [],
  },
  {
    title: "Sample maths and reasoning set",
    description: "15 quick aptitude and reasoning questions, 20 minutes.",
    papers: [2],
    rupees: 49,
    includedIn: ["PRO", "ELITE"],
  },
  {
    title: "Sample polity and science set",
    description: "15 questions on the Constitution and everyday science.",
    papers: [3],
    rupees: null,
    includedIn: [],
  },
];

/** A plain multi-page PDF (Helvetica, A4) of the given lines. */
function pdfOf(lines: string[]): Uint8Array {
  const perPage = 46;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage)
    pages.push(lines.slice(i, i + perPage));
  const escape = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`);
  // 1 catalog, 2 pages, 3 font, then a page and its content per page.
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  for (const [i, page] of pages.entries()) {
    const stream = [
      "BT /F1 11 Tf 56 790 Td 16 TL",
      ...page.map((line) => `(${escape(line)}) Tj T*`),
      "ET",
    ].join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, i) => {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets)
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

function paperLines(paper: (typeof PAPERS)[number]) {
  const lines = [
    paper.title.toUpperCase(),
    `${paper.questions.length} questions  -  ${paper.minutes} minutes  -  1 mark each, 1/3 off for a wrong answer`,
    "Sample questions written for practice on studypods. Mark your answers on the OMR sheet.",
    "",
  ];
  for (const [i, [question, options]] of paper.questions.entries())
    lines.push(
      `${i + 1}. ${question}`,
      `     (A) ${options[0]}      (B) ${options[1]}`,
      `     (C) ${options[2]}      (D) ${options[3]}`,
      "",
    );
  return lines;
}

async function admin() {
  const email = env.SEED_ADMIN_EMAIL?.toLowerCase();
  const user = email
    ? await prisma.user.findUnique({ where: { email }, select: { id: true } })
    : null;
  if (!user)
    throw new Error(
      "Run pnpm db:seed first: the super admin owns the demo papers.",
    );
  return user.id;
}

async function add() {
  const ownerId = await admin();
  const paperIds: string[] = [];
  for (const paper of PAPERS) {
    const found = await prisma.paper.findFirst({
      where: { ownerId, title: paper.title },
      select: { id: true },
    });
    if (found) {
      paperIds.push(found.id);
      continue;
    }
    const bytes = pdfOf(paperLines(paper));
    const key = `omr/${ownerId}/${randomUUID()}`;
    await storage.put(key, bytes, "application/pdf");
    const count = paper.questions.length;
    const made = await prisma.paper.create({
      data: {
        ownerId,
        title: paper.title,
        storageKey: key,
        sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        pageCount: Math.ceil(paperLines(paper).length / 46),
        questionCount: count,
        optionCount: 4,
        limitMin: paper.minutes,
        // A bitmask per question: bit 0 is A.
        answerKey: paper.questions.map(([, , answer]) => 1 << answer),
        keySource: "OWN",
        keyUpdatedAt: systemClock.now(),
        sheets: { create: { ownerId, marks: Array<number>(count).fill(0) } },
      },
      select: { id: true },
    });
    paperIds.push(made.id);
    console.log(`Paper: ${paper.title}`);
  }

  for (const item of ITEMS) {
    const found = await prisma.paperBundle.findFirst({
      where: { ownerId, catalogue: true, title: item.title },
      select: { id: true, hiddenAt: true },
    });
    if (found) {
      // Back in the Store if it was taken out with --remove.
      if (found.hiddenAt)
        await prisma.paperBundle.update({
          where: { id: found.id },
          data: { hiddenAt: null, publishedAt: systemClock.now() },
        });
      continue;
    }
    await bundleRepository.create({
      ownerId,
      title: item.title,
      description: item.description,
      pricePaise: item.rupees === null ? null : item.rupees * 100,
      groupId: null,
      channelId: null,
      paperIds: item.papers.map((i) => paperIds[i]!),
      catalogue: true,
      includedIn: item.includedIn,
      publishedAt: systemClock.now(),
    });
    console.log(`Store item: ${item.title}`);
  }
  console.log("The Store has its demo items.");
}

async function remove() {
  const ownerId = await admin();
  const { count } = await prisma.paperBundle.updateMany({
    where: {
      ownerId,
      catalogue: true,
      title: { in: ITEMS.map((i) => i.title) },
      hiddenAt: null,
    },
    data: { hiddenAt: systemClock.now(), publishedAt: null },
  });
  console.log(`Took ${count} demo items out of the Store.`);
}

(process.argv.includes("--remove") ? remove() : add())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
