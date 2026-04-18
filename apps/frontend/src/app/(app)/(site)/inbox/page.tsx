import { Metadata } from 'next';
import { InboxPage } from '@gitroom/frontend/components/inbox/inbox.page';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} - Inbox`,
  description: '',
};

export default function Inbox() {
  return <InboxPage />;
}
