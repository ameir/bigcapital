import Agenda from 'agenda';
import WelcomeEmailJob from '@/Jobs/welcomeEmail';
import ComputeItemCost from '@/Jobs/ComputeItemCost';
import RewriteInvoicesJournalEntries from '@/jobs/writeInvoicesJEntries';

export default ({ agenda }: { agenda: Agenda }) => {
  agenda.define(
    'welcome-email',
    { priority: 'high' },
    new WelcomeEmailJob().handler,
  );
  agenda.define(
    'compute-item-cost',
    { priority: 'high', concurrency: 20 },
    new ComputeItemCost().handler,
  );
  agenda.define(
    'rewrite-invoices-journal-entries',
    { priority: 'normal', concurrency: 1, },
    new RewriteInvoicesJournalEntries().handler,
  );
  agenda.start();
};
