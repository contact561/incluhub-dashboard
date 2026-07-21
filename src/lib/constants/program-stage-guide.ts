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
      "Create student accounts, assign categories, and confirm payment or programme eligibility.",
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
      "As leader or assistant, book studio slots, submit your portfolio link, and respond to revision feedback when requested.",
    educator:
      "Review portfolio submissions for your mapped students — approve or request revision.",
    incluhub:
      "Monitor studio schedule, verify submissions, and provide final admin approval where required.",
  },
  {
    stageNumber: 4,
    title: "Brand Works",
    student:
      "Attend your team's Brand Works on the scheduled date and follow any instructions shared by IncluHub Admin.",
    educator:
      "Support your students during Brand Works. No separate educator approval is recorded on this stage.",
    incluhub:
      "Schedule and complete Brand Works for the team when Stage 3 portfolios are finished.",
  },
  {
    stageNumber: 5,
    title: "Ecosystem review",
    student:
      "Wait while IncluHub reviews your sessions and portfolio work. You will be notified when ecosystem onboarding is approved.",
    educator:
      "No approval action. Your earlier portfolio reviews form part of the final review.",
    incluhub:
      "Review each student's readiness individually and approve ecosystem access when satisfied.",
  },
];
