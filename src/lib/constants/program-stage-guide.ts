export type ProgramStageGuideEntry = {
  stageNumber: number;
  title: string;
  student: string;
  educator: string;
  incluhub: string;
};

export const PROGRAM_STAGE_GUIDE: ProgramStageGuideEntry[] = [
  {
    stageNumber: 0,
    title: "Onboarding",
    student:
      "Complete your profile and wait for IncluHub Admin to activate your account and place you in a programme.",
    educator:
      "No action required. You will be notified when a mapped student is enrolled.",
    incluhub:
      "Create student accounts, assign categories, and confirm programme eligibility.",
  },
  {
    stageNumber: 1,
    title: "Team assignment",
    student:
      "Join your balanced creative team (photographer, makeup artist, hairstylist) and meet your assigned educator.",
    educator:
      "Review your assigned student on the team. You do not approve this stage.",
    incluhub:
      "Create a balanced team, map each student to their category educator, and start the stage journey.",
  },
  {
    stageNumber: 2,
    title: "BMS session",
    student:
      "Attend the BMS session on the date communicated by IncluHub Admin.",
    educator:
      "Support your student to attend. No approval action is required on this stage.",
    incluhub:
      "Record BMS completion for the team after the session is delivered.",
  },
  {
    stageNumber: 3,
    title: "Portfolio creation",
    student:
      "Submit the moodboard, book the studio after Admin approval, enter the studio OTP, and upload the portfolio.",
    educator:
      "Monitor assigned moodboards and portfolios and add advisory comments visible to students and Admin.",
    incluhub:
      "Approve moodboards, generate attendance OTPs, and approve portfolios or request revision.",
  },
  {
    stageNumber: 4,
    title: "Brand Works",
    student:
      "Attend your team's Brand Works on the scheduled date and follow any instructions shared by IncluHub Admin.",
    educator:
      "Support your students during Brand Works. No educator approval is recorded.",
    incluhub:
      "Schedule and complete Brand Works for the team when Stage 3 portfolios are finished.",
  },
  {
    stageNumber: 5,
    title: "Ecosystem review",
    student:
      "Wait while IncluHub reviews your sessions and portfolio work. You will be notified when ecosystem onboarding is approved.",
    educator:
      "No approval action. Continue monitoring assigned students and add comments when useful.",
    incluhub:
      "Review each student's readiness individually and approve ecosystem access when satisfied.",
  },
];
