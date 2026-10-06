export const KNOWN_SITES = [
    'jobs-connect.vercel.app',
    'new-jobs-fawn.vercel.app',
    'jobsrefugee.ca',
    'vulnerableyouthsjobs.ca',
    'accesscareers.ca',
    'indigenouspeoplesjobs.ca',
] as const;

export type SiteId = typeof KNOWN_SITES[number];
export type MetadataSiteId = SiteId | '*';