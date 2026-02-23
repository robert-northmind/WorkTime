import type {
  CustomPTOType,
  FirestoreDailyEntry,
  UserDocument,
} from "../../types/firestore";

export const ALL_YEARS_START = "1900-01-01";
export const ALL_YEARS_END = "2100-12-31";

const FIXED_STATUS_LABELS: Record<string, string> = {
  work: "Work",
  vacation: "Vacation",
  holiday: "Holiday",
  sick: "Sick",
  "grafana-day": "Grafana Day",
};

export interface PTOUsageData {
  affectedEntries: FirestoreDailyEntry[];
  yearlyCounts: Array<{ year: string; count: number }>;
}

export interface ReassignOption {
  id: string;
  label: string;
}

type GetEntriesFn = (
  uid: string,
  startDate: string,
  endDate: string
) => Promise<FirestoreDailyEntry[]>;

type GetUserFn = (uid: string) => Promise<UserDocument | null>;
type SaveUserFn = (user: UserDocument) => Promise<void>;

export interface PersistCustomPTOSettingsParams {
  uid: string;
  currentEmail: string;
  nextCustomPTO: CustomPTOType[];
  fallbackSettings: UserDocument["settings"];
  getUserFn: GetUserFn;
  saveUserFn: SaveUserFn;
  nowIso?: string;
}

export const getStatusLabel = (
  statusId: string,
  customPTO: CustomPTOType[]
): string => {
  const fixed = FIXED_STATUS_LABELS[statusId];
  if (fixed) return fixed;
  const custom = customPTO.find((pto) => pto.id === statusId);
  return custom ? custom.name : statusId;
};

export const calculatePTOUsage = (
  entries: FirestoreDailyEntry[],
  ptoId: string
): PTOUsageData => {
  const affectedEntries = entries.filter((entry) => entry.status === ptoId);
  const yearMap = new Map<string, number>();

  affectedEntries.forEach((entry) => {
    const year = entry.date.slice(0, 4);
    yearMap.set(year, (yearMap.get(year) || 0) + 1);
  });

  const yearlyCounts = Array.from(yearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, count]) => ({ year, count }));

  return { affectedEntries, yearlyCounts };
};

export const fetchPTOUsage = async (
  uid: string,
  ptoId: string,
  getEntriesFn: GetEntriesFn
): Promise<PTOUsageData> => {
  const entries = await getEntriesFn(uid, ALL_YEARS_START, ALL_YEARS_END);
  return calculatePTOUsage(entries, ptoId);
};

export const archiveCustomPTOType = (
  customPTO: CustomPTOType[],
  ptoId: string
): CustomPTOType[] => {
  return customPTO.map((item) =>
    item.id === ptoId ? { ...item, archived: true } : item
  );
};

export const restoreCustomPTOType = (
  customPTO: CustomPTOType[],
  ptoId: string
): CustomPTOType[] => {
  return customPTO.map((item) =>
    item.id === ptoId ? { ...item, archived: false } : item
  );
};

export const removeCustomPTOType = (
  customPTO: CustomPTOType[],
  ptoId: string
): CustomPTOType[] => {
  return customPTO.filter((item) => item.id !== ptoId);
};

export const reassignEntriesStatus = (
  entries: FirestoreDailyEntry[],
  targetStatus: string
): FirestoreDailyEntry[] => {
  return entries.map((entry) => ({
    ...entry,
    status: targetStatus,
  }));
};

export const buildReassignOptions = (
  customPTO: CustomPTOType[],
  deletingPTOId?: string
): ReassignOption[] => {
  const baseOptions: ReassignOption[] = [
    { id: "work", label: "Work" },
    { id: "vacation", label: "Vacation" },
    { id: "holiday", label: "Holiday" },
    { id: "sick", label: "Sick" },
  ];

  const customOptions = customPTO
    .filter((pto) => !pto.archived && pto.id !== deletingPTOId)
    .map((pto) => ({ id: pto.id, label: pto.name }));

  return [...baseOptions, ...customOptions];
};

export const persistCustomPTOSettings = async (
  params: PersistCustomPTOSettingsParams
): Promise<void> => {
  const {
    uid,
    currentEmail,
    nextCustomPTO,
    fallbackSettings,
    getUserFn,
    saveUserFn,
    nowIso,
  } = params;

  const latestUserDoc = await getUserFn(uid);

  const settings: UserDocument["settings"] = {
    ...(latestUserDoc?.settings || fallbackSettings),
    customPTO: nextCustomPTO,
  };

  await saveUserFn({
    uid,
    email: latestUserDoc?.email || currentEmail,
    settings,
    createdAt: latestUserDoc?.createdAt || nowIso || new Date().toISOString(),
  });
};
