export function timeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  
    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };
  
    for (const intervalName in intervals) {
      const interval = intervals[intervalName];
      const count = Math.floor(diffInSeconds / interval);
      if (count > 0) {
        return `${count} ${intervalName}${count !== 1 ? 's' : ''} ago`;
      }
    }
  
    return 'just now';
  } 