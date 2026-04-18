import { Metadata } from 'next';
import { HomePage } from '@gitroom/frontend/components/home/home.page';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'SwiftsAI' : 'AppSwifts'} - Home`,
  description: '',
};

export default function Home() {
  return <HomePage />;
}
