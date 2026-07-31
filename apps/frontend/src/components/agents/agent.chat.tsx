'use client';

import React, { FC, useCallback, useContext, useEffect } from 'react';
import {
  CopilotChat,
  CopilotKit,
  useAgentContext,
  useConfigureSuggestions,
  useHumanInTheLoop,
} from '@copilotkit/react-core/v2';
import { z } from 'zod';
import { PropertiesContext } from '@gitroom/frontend/components/agents/agent';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useParams } from 'next/navigation';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import dayjs from 'dayjs';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useT } from '@gitroom/react/translation/get.transation.service.client';

const manualPostingSchema = z.object({
  list: z.array(
    z.object({
      integrationId: z.string().describe('The selected social channel ID'),
      date: z.string().describe('UTC date for the scheduled post'),
      settings: z.record(z.any()).optional(),
      posts: z.array(
        z.object({
          content: z.string(),
          attachments: z.array(
            z.object({
              id: z.string(),
              path: z.string(),
            })
          ),
        })
      ),
    })
  ),
});

type ManualPostingArgs = z.infer<typeof manualPostingSchema>;

export const AgentChat: FC = () => {
  const { backendUrl } = useVariables();
  const params = useParams<{ id?: string }>();
  const { properties } = useContext(PropertiesContext);
  const t = useT();
  const threadId = params.id && params.id !== 'new' ? params.id : undefined;

  return (
    <CopilotKit
      credentials="include"
      runtimeUrl={backendUrl + '/copilot/agent'}
      useSingleEndpoint
      agent="postiz"
      properties={{ integrations: properties }}
      enableInspector={false}
      showDevConsole={false}
    >
      <CopilotWorkspaceContext />
      <PublishingApproval />
      <div className="agent-v2 flex min-h-0 min-w-0 flex-1 flex-col bg-newBgColorInner">
        <div className="min-h-0 min-w-0 flex-1">
          <CopilotChat
            agentId="postiz"
            threadId={threadId}
            className="h-full w-full"
            labels={{
              chatInputPlaceholder: t(
                'agent_input_placeholder',
                'Ask SwiftsAI to create, improve, or schedule content…'
              ),
              chatDisclaimerText: t(
                'agent_disclaimer',
                'Review generated content before publishing.'
              ),
              welcomeMessageText: t(
                'agent_workspace_welcome',
                'What would you like to create or schedule today?'
              ),
            }}
            attachments={{ enabled: true }}
          />
        </div>
      </div>
    </CopilotKit>
  );
};

const CopilotWorkspaceContext: FC = () => {
  const { properties } = useContext(PropertiesContext);

  useAgentContext({
    description:
      'Social channels selected by the signed-in user for this organization',
    value: properties.map((integration: any) => ({
      id: integration.id,
      name: integration.name,
      identifier: integration.identifier,
      disabled: Boolean(integration.disabled),
    })),
  });

  useConfigureSuggestions({
    suggestions: [
      {
        title: 'Create a campaign',
        message:
          'Create a complete social media campaign for my selected channels. Ask me for any essential missing details.',
      },
      {
        title: 'Plan this week',
        message:
          'Build a practical content plan for this week for my selected channels.',
      },
      {
        title: 'Improve a draft',
        message:
          'Help me improve a draft for each selected social platform. Ask me to paste the draft.',
      },
      {
        title: 'Schedule content',
        message:
          'Help me create and schedule platform-ready posts for my selected channels.',
      },
    ],
    available: 'always',
  });

  return null;
};

const PublishingApproval: FC = () => {
  useHumanInTheLoop({
    agentId: 'postiz',
    name: 'manualPosting',
    description:
      'Open the publishing review workflow when the user wants to schedule or publish generated social posts.',
    parameters: manualPostingSchema,
    render: ({ args, status, respond }) => {
      if (status === 'executing' && respond) {
        return (
          <OpenModal
            args={args as ManualPostingArgs}
            respond={(value) => respond(value)}
          />
        );
      }

      if (status === 'inProgress') {
        return (
          <div className="rounded-lg border border-newBgLineColor bg-newBgColorInner p-3 text-sm text-newTextColor/60">
            Preparing your publishing review…
          </div>
        );
      }

      return null;
    },
  });

  return null;
};

const OpenModal: FC<{
  respond: (value: { approved: boolean; message: string }) => void;
  args: ManualPostingArgs;
}> = ({ args, respond }) => {
  const modals = useModals();
  const { properties } = useContext(PropertiesContext);

  const startModal = useCallback(async () => {
    for (const integration of args.list || []) {
      const selectedIntegration = properties.find(
        (item: any) => item.id === integration.integrationId
      );

      if (!selectedIntegration) {
        respond({
          approved: false,
          message:
            'A requested social channel is not selected for this organization.',
        });
        return;
      }

      await new Promise<void>((resolve) => {
        const group = makeId(10);
        modals.openModal({
          id: 'add-edit-modal',
          closeOnClickOutside: false,
          removeLayout: true,
          closeOnEscape: false,
          withCloseButton: false,
          askClose: true,
          size: '80%',
          title: '',
          classNames: {
            modal: 'w-[100%] max-w-[1400px] text-textColor',
          },
          children: (
            <ExistingDataContextProvider
              value={{
                group,
                integration: integration.integrationId,
                integrationPicture: selectedIntegration.picture || '',
                settings: integration.settings || {},
                posts: integration.posts.map((post) => ({
                  approvedSubmitForOrder: 'NO',
                  content: post.content,
                  createdAt: new Date().toISOString(),
                  state: 'DRAFT',
                  id: makeId(10),
                  settings: JSON.stringify(integration.settings || {}),
                  group,
                  integrationId: integration.integrationId,
                  integration: selectedIntegration,
                  publishDate: dayjs.utc(integration.date).toISOString(),
                  image: post.attachments.map((attachment) => ({
                    id: attachment.id,
                    path: attachment.path,
                  })),
                })),
              }}
            >
              <AddEditModal
                date={dayjs.utc(integration.date)}
                allIntegrations={properties}
                integrations={[selectedIntegration]}
                onlyValues={integration.posts.map((post) => ({
                  content: post.content,
                  id: makeId(10),
                  settings: integration.settings || {},
                  image: post.attachments.map((attachment) => ({
                    id: attachment.id,
                    path: attachment.path,
                  })),
                }))}
                reopenModal={() => {}}
                mutate={() => resolve()}
              />
            </ExistingDataContextProvider>
          ),
        });
      });
    }

    respond({
      approved: true,
      message: 'The user reviewed and scheduled all posts.',
    });
  }, [args, modals, properties, respond]);

  useEffect(() => {
    startModal();
  }, [startModal]);

  return (
    <div className="rounded-lg border border-newBgLineColor bg-newBgColorInner p-3 text-sm">
      Opening the secure publishing review…
    </div>
  );
};
