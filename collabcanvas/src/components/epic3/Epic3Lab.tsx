/**
 * Epic 3 Test Lab - Isolated testing environment for Epic 3 features
 * Progressively unlocks as PRs are completed
 */
import React, { useState } from 'react';
import { PR1StorageTest } from './PR1StorageTest';
import { PR2ParsingTest } from './PR2ParsingTest';
import { PRPlaceholder } from './PRPlaceholder';

type PRStatus = 'completed' | 'in-progress' | 'locked';

interface PRInfo {
  id: string;
  number: number;
  title: string;
  status: PRStatus;
  description: string;
  component: React.ComponentType;
}

export const Epic3Lab: React.FC = () => {
  const [activePR, setActivePR] = useState<string>('pr1');

  // PR status - update as we complete each PR
  const prs: PRInfo[] = [
    {
      id: 'pr1',
      number: 1,
      title: 'Storage & CAD Upload',
      status: 'completed',
      description: 'File upload validation, type/size checks, storage service',
      component: PR1StorageTest,
    },
    {
      id: 'pr2',
      number: 2,
      title: 'CAD Parsing (DWG/DXF + Vision)',
      status: 'completed',
      description: 'ezdxf parser, GPT-4o Vision, extraction results',
      component: PR2ParsingTest,
    },
    {
      id: 'pr3',
      number: 3,
      title: 'Voice Transcription',
      status: 'locked',
      description: 'Whisper fallback, audio recording, transcription',
      component: PRPlaceholder,
    },
    {
      id: 'pr4',
      number: 4,
      title: 'Clarification Agent',
      status: 'locked',
      description: 'Chat interface, start_estimate, send_clarification_message',
      component: PRPlaceholder,
    },
    {
      id: 'pr5',
      number: 5,
      title: 'ClarificationOutput Assembly',
      status: 'locked',
      description: 'Schema v3.0.0, validation, 24 CSI divisions',
      component: PRPlaceholder,
    },
    {
      id: 'pr6',
      number: 6,
      title: 'Pipeline Handoff',
      status: 'locked',
      description: 'Status transitions, handoff to Dev 2, error surfaces',
      component: PRPlaceholder,
    },
    {
      id: 'pr7',
      number: 7,
      title: 'Security Rules',
      status: 'locked',
      description: 'Firestore/Storage rules, emulator configs',
      component: PRPlaceholder,
    },
    {
      id: 'pr8',
      number: 8,
      title: 'End-to-End Tests',
      status: 'locked',
      description: 'Mocks, fixtures, full flow integration',
      component: PRPlaceholder,
    },
  ];

  const activePRInfo = prs.find((pr) => pr.id === activePR) || prs[0];
  const ActiveComponent = activePRInfo.component;

  const getStatusColor = (status: PRStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'locked':
        return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: PRStatus) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in-progress':
        return '🔨';
      case 'locked':
        return '🔒';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                🧪 Epic 3 Test Lab
              </h1>
              <p className="text-indigo-100">
                User Input & Clarification - Isolated Testing Environment
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-indigo-100 mb-1">Progress</div>
              <div className="text-2xl font-bold">
                {prs.filter((pr) => pr.status === 'completed').length} / {prs.length} PRs
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - PR Navigation */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Pull Requests
              </h2>
              <nav className="space-y-2">
                {prs.map((pr) => (
                  <button
                    key={pr.id}
                    onClick={() => setActivePR(pr.id)}
                    disabled={pr.status === 'locked'}
                    className={`
                      w-full text-left px-4 py-3 rounded-lg transition-all
                      ${
                        activePR === pr.id
                          ? 'bg-indigo-100 border-2 border-indigo-500 shadow-sm'
                          : pr.status === 'locked'
                          ? 'bg-gray-50 border border-gray-200 opacity-50 cursor-not-allowed'
                          : 'bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getStatusIcon(pr.status)}</span>
                      <span className="font-semibold text-sm text-gray-700">
                        PR {pr.number}
                      </span>
                      <div
                        className={`ml-auto w-2 h-2 rounded-full ${getStatusColor(
                          pr.status
                        )}`}
                      />
                    </div>
                    <div className="text-xs font-medium text-gray-900 mb-1">
                      {pr.title}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">
                      {pr.description}
                    </div>
                  </button>
                ))}
              </nav>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-600 mb-2">
                  Status Legend
                </h3>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔨</span>
                    <span>In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🔒</span>
                    <span>Locked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Active PR Test Component */}
          <div className="col-span-9">
            <div className="bg-white rounded-lg shadow-md">
              {/* PR Header */}
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getStatusIcon(activePRInfo.status)}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      PR {activePRInfo.number}: {activePRInfo.title}
                    </h2>
                    <p className="text-sm text-gray-600">{activePRInfo.description}</p>
                  </div>
                </div>
              </div>

              {/* PR Test Component */}
              <div className="p-6">
                <ActiveComponent prInfo={activePRInfo} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

