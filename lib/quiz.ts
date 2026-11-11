// Result copy and scoring. Safe to import from client and server code. The questions themselves live in
// lib/builtInQuestions.ts (the built-in set) and in the database (the sets an administrator saves).
import { builtInContent, QUESTION_COUNT, type QuestionSetContent } from "./questionSet";

export type { Question } from "./builtInQuestions";

export type Band = "critical" | "warning" | "safe";
export type CategoryStatus = "red" | "warning" | "healthy";

export type CategoryResult = {
  num: 1 | 2 | 3;
  title: string;
  score: number;
  maxScore: number;
  status: CategoryStatus;
  desc: string;
  action: string;
};

export type AuditResult = {
  percentScore: number;
  band: Band;
  bandLabel: string;
  overallDesc: string;
  categories: CategoryResult[];
  guide: { heading: string; body: string }[];
  // True when any safety question got its most severe answer. Results then lead
  // with where to get help, and courses are not shown.
  safetyFlag: boolean;
};

const categoryCopy: Record<1 | 2 | 3, Record<CategoryStatus, { desc: string; action: string }>> = {
  1: {
    red: {
      desc: "พบสัญญาณการล่วงละเมิดขอบเขต หรือความรุนแรงทางอารมณ์/จิตใจ คุณอาจรู้สึกกดดันหรือสูญเสียความปลอดภัย",
      action: "ความปลอดภัยของคุณต้องมาก่อน ปรึกษาคนที่ไว้ใจหรือหน่วยงานช่วยเหลือ และวางแผนให้รอบคอบก่อนเผชิญหน้ากับอีกฝ่าย",
    },
    warning: {
      desc: "มีพฤติกรรมก้าวก่ายหรือใช้อารมณ์บ้างเป็นบางครั้ง เริ่มสะสมความอึดอัดเล็กน้อย",
      action: "สื่อสารขอบเขตให้ชัดเจนตั้งแต่เนิ่นๆ ก่อนที่จะกลายเป็นความเคยชินที่ไม่ถูกต้อง",
    },
    healthy: {
      desc: "ให้เกียรติซึ่งกันและกัน มีขอบเขตที่ปลอดภัย ไม่มีพฤติกรรม Toxic รุนแรง",
      action: "รักษามาตรฐานความปลอดภัยนี้ไว้ และต่อยอดความใกล้ชิด",
    },
  },
  2: {
    red: {
      desc: "เป้าหมาย ศีลธรรม หรือตัวตนขัดแย้งกันอย่างรุนแรง ไม่มีพื้นที่สำหรับการเคารพซึ่งกันและกัน",
      action: "ต้องประเมินอย่างตั้งสติว่าเป้าหมายนี้คุ้มค่าที่จะปรับเปลี่ยน หรือแยกย้ายเพื่อเติบโต",
    },
    warning: {
      desc: "เป้าหมายตรงกันบางเรื่อง แต่ยังมีบางประเด็นใหญ่ที่ยังปรับจูนไม่ลงตัว",
      action: "เปิดใจพูดคุยหาตรงกลางด้วยตรรกะ โดยไม่ใช้การประชดประชัน",
    },
    healthy: {
      desc: "วิสัยทัศน์ ศีลธรรม และเป้าหมายชีวิตสอดคล้องกันดีมาก",
      action: "วางแผนอนาคตร่วมกันต่อยอดให้เติบโตรวดเร็วขึ้น",
    },
  },
  3: {
    red: {
      desc: "ขาดทักษะการสื่อสาร ใช้อีโก้ เงียบใส่ หรือปัญหาเรื่องเวลาและความใกล้ชิดสะสม",
      action: "ต้องปรับเปลี่ยนรูปแบบการสื่อสาร และคุยกันอย่างตรงไปตรงมาเพื่อสร้างความใส่ใจใหม่",
    },
    warning: {
      desc: "การสื่อสารและอารมณ์มีความสั่นคลอนเป็นพักๆ ยังไม่สามารถสื่อสารได้อย่างลึกซึ้ง",
      action: "ใช้ความเข้าใจด้านจิตวิทยาเพื่อเติมความหวาน และสร้างความสนใจต่อกันอีกครั้ง",
    },
    healthy: {
      desc: "มีทักษะการสื่อสาร รับฟัง และการจัดการอารมณ์อยู่ในระดับที่ดีมาก",
      action: "เติมความอบอุ่นและเสน่ห์ในความสัมพันธ์ให้ต่อเนื่อง",
    },
  },
};

const categoryNumbers = [1, 2, 3] as const;

// Every question has three answers, and the answers of a question score 0, 1 and 2 in some order, so a
// question is worth at most 2 and the maximums follow from how many questions a category has.
const MAX_PER_QUESTION = 2;

// The answers are the position (0, 1 or 2) of the answer chosen for each question, in order. They are checked
// against the number of questions of the set they were given for.
export function isValidAnswers(value: unknown, count: number = QUESTION_COUNT): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === count &&
    value.every((a) => a === 0 || a === 1 || a === 2)
  );
}

// The score of an answer comes from the set it was given for, never from its position or from the browser.
export function scoreAnswers(answers: number[], content: QuestionSetContent = builtInContent()): AuditResult {
  const set = content.questions;
  const scoreOf = (i: number) => set[i].options[answers[i]].score;
  const sumFor = (cat: number) => set.reduce((sum, q, i) => (q.category === cat ? sum + scoreOf(i) : sum), 0);

  // A severe answer is the one that scores 0 in a safety question (category 1).
  const safetyFlag = set.some((q, i) => q.category === 1 && scoreOf(i) === 0);

  const categories: CategoryResult[] = categoryNumbers.map((num) => {
    // The short name comes from the set, so an edited category name shows on the result page too.
    const title = content.categories[num - 1].name;
    const maxScore = set.filter((q) => q.category === num).length * MAX_PER_QUESTION;
    const score = sumFor(num);
    const ratio = score / maxScore;
    const status: CategoryStatus = ratio < 0.5 ? "red" : ratio < 0.8 ? "warning" : "healthy";
    // A single severe safety answer always gets the safety advice, whatever the total.
    const copy = categoryCopy[num][num === 1 && safetyFlag ? "red" : status];
    return { num, title, score, maxScore, status: num === 1 && safetyFlag ? "red" : status, ...copy };
  });

  const total = categories.reduce((sum, c) => sum + c.score, 0);
  const percentScore = Math.round((total / (set.length * MAX_PER_QUESTION)) * 100);

  let band: Band;
  let bandLabel: string;
  let overallDesc: string;
  if (safetyFlag) {
    // A high total must never read as "safe" when a safety answer was severe.
    band = "critical";
    bandLabel = "มีสัญญาณด้านความปลอดภัย / Red Flag";
    overallDesc =
      "แม้ด้านอื่นของความสัมพันธ์อาจดูดี แต่คำตอบของคุณมีสัญญาณด้านความปลอดภัยที่ควรให้ความสำคัญเป็นอันดับแรก";
  } else if (percentScore < 50) {
    band = "critical";
    bandLabel = "วิกฤต / Red Flag";
    overallDesc =
      "ความสัมพันธ์มีความเสี่ยงสูงที่จะทำลายความสุขและพลังชีวิตของคุณ มีสัญญาณอันตรายสะสมหลายจุดที่ควรได้รับการดูแลโดยด่วน";
  } else if (percentScore < 80) {
    band = "warning";
    bandLabel = "ควรเฝ้าระวัง / Warning";
    overallDesc =
      "ความสัมพันธ์มีทั้งช่วงที่ดีและช่องโหว่ที่ก่อให้เกิดความบั่นทอน สามารถปรับแก้ไขให้มั่นคงได้หากเข้าใจจุดที่ต้องแก้และคุยกันอย่างถูกจุด";
  } else {
    band = "safe";
    bandLabel = "สมบูรณ์และแข็งแกร่ง / Safe";
    overallDesc =
      "สุขภาพความสัมพันธ์อยู่ในระดับดีมาก มีรากฐานความเคารพและการสื่อสารที่ดี การดูแลเสน่ห์และความใกล้ชิดจะช่วยให้ความสัมพันธ์ยิ่งมั่นคงตลอดไป";
  }

  return {
    percentScore,
    band,
    bandLabel,
    overallDesc,
    categories,
    guide: buildGuide(safetyFlag, percentScore),
    safetyFlag,
  };
}

function buildGuide(safetyFlag: boolean, percentScore: number) {
  if (safetyFlag) {
    return [
      {
        heading: "1. ความปลอดภัยของคุณมาก่อนทุกอย่าง:",
        body: "คำตอบของคุณบ่งบอกสัญญาณของการถูกทำร้ายหรือถูกควบคุม สิ่งนี้ไม่ใช่ความผิดของคุณ และไม่ใช่เรื่องที่คุณต้องแก้ด้วยการปรับตัวหรือเอาใจให้มากขึ้น",
      },
      {
        heading: "2. อย่าเผชิญเรื่องนี้คนเดียว:",
        body: "เล่าให้คนที่ไว้ใจฟัง หรือโทรหาหน่วยงานด้านล่างเพื่อวางแผนอย่างปลอดภัย หากคิดจะยุติความสัมพันธ์หรือเผชิญหน้ากับอีกฝ่าย ควรเตรียมที่พักและคนช่วยเหลือไว้ก่อน",
      },
      {
        heading: "3. สรุปคำแนะนำโดยอาจารย์ขวัญ:",
        body: '"อย่าใช้ความรักเพื่อกลบเกลื่อนความจริง" คุณมีสิทธิ์ที่จะรู้สึกปลอดภัยในความสัมพันธ์ของตัวเอง',
      },
    ];
  }

  return [
    {
      heading: "1. ยุทธศาสตร์การควบคุมสถานการณ์:",
      body: "รากฐานความปลอดภัยของคุณอยู่ในเกณฑ์ดี สิ่งที่ต้องโฟกัสคือการไม่ปล่อยให้ความคุ้นเคยทำลายความตื่นเต้นในชีวิตคู่",
    },
    percentScore < 60
      ? {
          heading: "2. การรักษาคุณค่าและการหยุดวิ่งตาม:",
          body: "เมื่ออีกฝ่ายเริ่มเย็นชา หรือใช้อีโก้ใส่ การวิ่งตาม ตื๊อ หรืออ้อนวอนมีแต่จะทำให้คุณเหนื่อยและเสียคุณค่าในตัวเอง ถอยออกมาดูแลตัวเอง แล้วประเมินด้วยเหตุผลว่าความสัมพันธ์นี้ให้อะไรกับคุณ",
        }
      : {
          heading: "2. การสร้างความผูกพันระยะยาว (Emotional Attachment):",
          body: "คุณมีโครงสร้างที่ดีแล้ว ขั้นต่อไปคือการดูแลความใส่ใจ ความหวาน และการสื่อสาร เพื่อให้ทั้งสองฝ่ายยังเลือกกันและกันในทุกๆ วัน",
        },
    {
      heading: "3. สรุปคำแนะนำโดยอาจารย์ขวัญ:",
      body: '"อย่าใช้ความรักเพื่อกลบเกลื่อนความจริง จงใช้ความเข้าใจในสมองและจิตวิทยาเพื่อสร้างผลลัพธ์ที่คุณต้องการ" ไม่ว่าคุณจะอยากแก้ปัญหาความเย็นชา หรือเติมไฟรักให้ความสัมพันธ์ คุณเริ่มได้จากความเข้าใจที่ถูกต้อง',
    },
  ];
}
