import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web';
import type { QuizPageLink } from '../../../types/quiz';

export function createQuizPageLinksApi(db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) {
  return {
    async getLinksByBattery(batteryId: string): Promise<QuizPageLink[]> {
      let links: QuizPageLink[] = [];
      try {
        links = (await db.getAllFromIndex('quiz_page_links', 'battery_id', batteryId)) || [];
      } catch {
        const all = (await db.getAll('quiz_page_links')) || [];
        links = all.filter((l: QuizPageLink) => l.battery_id === batteryId);
      }
      return links.filter((l) => !l.deleted_at);
    },

    async getLinksByPage(pageId: string): Promise<QuizPageLink[]> {
      let links: QuizPageLink[] = [];
      try {
        links = (await db.getAllFromIndex('quiz_page_links', 'page_id', pageId)) || [];
      } catch {
        const all = (await db.getAll('quiz_page_links')) || [];
        links = all.filter((l: QuizPageLink) => l.page_id === pageId);
      }
      return links.filter((l) => !l.deleted_at);
    },

    async linkBatteryToPage(batteryId: string, pageId: string): Promise<QuizPageLink> {
      const existing = await this.getLinksByBattery(batteryId);
      const alreadyLinked = existing.find((l) => l.page_id === pageId);
      if (alreadyLinked) return alreadyLinked;

      const newLink: QuizPageLink = {
        id: generateId(),
        battery_id: batteryId,
        page_id: pageId,
        created_at: new Date().toISOString(),
        deleted_at: null,
      };

      await db.put('quiz_page_links', newLink);
      return newLink;
    },

    async unlinkBatteryFromPage(batteryId: string, pageId: string): Promise<boolean> {
      const existing = await this.getLinksByBattery(batteryId);
      const link = existing.find((l) => l.page_id === pageId);
      if (!link) return false;

      const now = new Date().toISOString();
      await db.put('quiz_page_links', {
        ...link,
        deleted_at: now,
      });
      return true;
    },
  };
}
