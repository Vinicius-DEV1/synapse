export interface ICadernoAPI {
  onSyncTrigger?: (callback: () => void) => () => void;
  // This interface will be progressively expanded as we slice the domains
  finance?: any;
  library?: any;
  auth?: any;
  culture?: any;
  // TODO: Add strict types
}
