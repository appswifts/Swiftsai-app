import { Metadata } from 'next';
import { CommentsPage } from '@gitroom/frontend/components/comments/comments.page';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} - Comments`,
  description: '',
};

export default function Comments() {
  return <CommentsPage />;
}
