
// src/components/DashboardMockup.tsx
'use client';

import React from 'react';
import Image from 'next/image'; // Assuming Image component is configured for external URLs if used

/**
 * Renders a mock-up of the AI Tutor App's interactive dashboard.
 * This component showcases the proposed layout and core sections with placeholder data,
 * demonstrating a clean, modern, and responsive design.
 */
const DashboardMockup: React.FC = () => {
  // Placeholder data for the dashboard sections
  const userData = {
    name: 'Alex Johnson',
    avatarUrl: 'https://lh3.googleusercontent.com/a/ACg8ocL2q6y9_xY_y_y_y_y_y_y_y_y_y_y_y_y_y_y_y=s96-c', // Example Google profile pic URL
    learningProgress: 75, // Percentage
    learningStreak: 15, // Days
  };

  const performanceData = {
    dailyTimeSpent: 'See chart below',
    accuracyQuizzes: '88%',
    accuracySubjective: '72%',
    skillAreas: ['Algebra', 'Biology', 'History', 'Physics', 'Literature'],
    skillScores: [85, 70, 90, 75, 80], // Corresponding scores for skill areas
  };

  const activityFeed = [
    { id: 1, type: 'Document Upload', description: 'Uploaded "Photosynthesis Notes.pdf"', time: '2 hours ago', icon: '📄' },
    { id: 2, type: 'Quiz Completed', description: 'Finished "Algebra Quiz 1" (8/10)', time: 'yesterday', icon: '📝' },
    { id: 3, type: 'New Session', description: 'Started "Teach Me This" on Quantum Physics', time: '2 days ago', icon: '👩‍🏫' },
    { id: 4, type: 'Badge Earned', description: 'Awarded "Quick Learner" Badge', time: '3 days ago', icon: '🏅' },
    { id: 5, type: 'Document Upload', description: 'Uploaded "World War II Overview.docx"', time: '1 week ago', icon: '📄' },
  ];

  const upcomingTasks = [
    { id: 1, type: 'recommended', text: 'Next: Review "Calculus Derivatives"', icon: '💡' },
    { id: 2, type: 'quiz', text: 'Pending Quiz: Geometry Basics', icon: '📝' },
    { id: 3, type: 'lesson', text: 'Lesson: European History (Part 2)', icon: '📚' },
    { id: 4, type: 'reminder', text: 'Custom: Practice French verbs', icon: '⏰' },
  ];

  const insights = [
    { id: 1, text: 'Focus more on Subjective Q&A for better mastery in Chemistry.', type: 'tip' },
    { id: 2, text: 'Generate Smart Summaries for your notes to save time!', type: 'feature_suggest' },
    { id: 3, text: 'Your streak is impressive! Keep it up.', type: 'encouragement' },
  ];

  const smartShortcuts = [
    { id: 1, text: 'Upload Document', icon: '📄', action: () => alert('Navigate to Upload') },
    { id: 2, text: 'Start New Quiz', icon: '📝', action: () => alert('Navigate to New Quiz') },
    { id: 3, text: 'Review Errors', icon: '🔎', action: () => alert('Navigate to Error Review') },
    { id: 4, text: 'Teach Me This', icon: '👩‍🏫', action: () => alert('Start Teach Me session') },
  ];

  // Helper component for a generic dashboard card
  const DashboardCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-white p-6 rounded-xl shadow-md border border-gray-100 ${className}`}>
      <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        {/* Top Banner: User Profile & Overview/Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile */}
          <DashboardCard title="Welcome!" className="lg:col-span-1">
            <div className="flex items-center space-x-4 mb-4">
              <Image
                src={userData.avatarUrl}
                alt="User Avatar"
                width={64}
                height={64}
                className="rounded-full border-2 border-indigo-300 shadow-sm"
              />
              <div>
                <p className="text-2xl font-semibold text-gray-900">Hi, {userData.name}!</p>
                <p className="text-sm text-gray-500">Ready for a new session?</p>
              </div>
            </div>
            {/* Learning Streak */}
            <div className="flex items-center text-sm text-gray-700 mb-2">
              <span className="text-xl mr-2">🔥</span>
              <p>Learning Streak: <span className="font-bold text-indigo-700">{userData.learningStreak} days</span></p>
            </div>
            {/* Overall Progress */}
            <div className="mb-2">
              <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${userData.learningProgress}%` }}
                  role="progressbar"
                  aria-valuenow={userData.learningProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
              <p className="text-right text-sm text-gray-500 mt-1">{userData.learningProgress}% Complete</p>
            </div>
          </DashboardCard>

          {/* Quick Summary */}
          <DashboardCard title="Quick Summary" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-700 font-medium">Last Session</p>
                <p className="text-2xl font-bold text-indigo-800">1h 15m</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-700 font-medium">Time This Week</p>
                <p className="text-2xl font-bold text-purple-800">7h 30m</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Avg. Accuracy</p>
                <p className="text-2xl font-bold text-green-800">80%</p>
              </div>
            </div>
          </DashboardCard>
        </div>

        {/* Main Grid: Performance, Upcoming, Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Performance Analytics (takes 2/3 width on large screens) */}
          <DashboardCard title="Performance Analytics 📊" className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Graph: Daily/weekly time spent */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Daily/Weekly Time Spent</h4>
                <div className="bg-gray-100 h-40 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  [Graph Placeholder: Line Chart]
                </div>
              </div>
              {/* Chart: Accuracy in quizzes vs. subjective Q&A */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Accuracy: Quizzes vs. Subjective Q&A</h4>
                <div className="bg-gray-100 h-40 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  [Chart Placeholder: Bar Chart]
                </div>
              </div>
              {/* Skill wheel or radar chart */}
              <div className="md:col-span-2">
                <h4 className="font-semibold text-gray-700 mb-2">Strengths & Weaknesses by Topic</h4>
                <div className="bg-gray-100 h-40 rounded-lg flex items-center justify-center text-gray-500 text-sm">
                  [Radar Chart Placeholder: {performanceData.skillAreas.join(', ')}]
                </div>
              </div>
            </div>
          </DashboardCard>

          {/* Right Column: Upcoming/Active Tasks & Smart Shortcuts */}
          <div className="space-y-8 lg:col-span-1">
            {/* Upcoming/Active Tasks */}
            <DashboardCard title="Upcoming/Active Tasks 🗓️">
              <ul className="space-y-3">
                {upcomingTasks.map(task => (
                  <li key={task.id} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="mr-3 text-lg">{task.icon}</span>
                    <span className="text-gray-700">{task.text}</span>
                  </li>
                ))}
              </ul>
            </DashboardCard>
            {/* Smart Shortcuts */}
            <DashboardCard title="Smart Shortcuts ✨">
              <div className="grid grid-cols-2 gap-4">
                {smartShortcuts.map(shortcut => (
                  <button
                    key={shortcut.id}
                    onClick={shortcut.action}
                    className="flex flex-col items-center justify-center p-4 bg-indigo-100 text-indigo-800 rounded-lg shadow-sm hover:bg-indigo-200 transition-colors cursor-pointer text-sm font-medium"
                  >
                    <span className="text-2xl mb-1">{shortcut.icon}</span>
                    {shortcut.text}
                  </button>
                ))}
              </div>
            </DashboardCard>
          </div>
        </div>

        {/* Bottom Row: Activity Feed & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Feed */}
          <DashboardCard title="Recent Activity 🚀" className="lg:col-span-1">
            <ul className="space-y-4">
              {activityFeed.map(activity => (
                <li key={activity.id} className="flex items-start">
                  <span className="text-xl mr-3 mt-1">{activity.icon}</span>
                  <div>
                    <p className="text-gray-800 font-medium">{activity.type}: {activity.description}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </DashboardCard>

          {/* Insights & Recommendations */}
          <DashboardCard title="Insights & Recommendations 💡" className="lg:col-span-1">
            <ul className="space-y-4">
              {insights.map(insight => (
                <li key={insight.id} className="flex items-start">
                  <span className="text-xl mr-3 mt-1">
                    {insight.type === 'tip' ? '💡' : insight.type === 'feature_suggest' ? '🧠' : '✨'}
                  </span>
                  <p className="text-gray-700">{insight.text}</p>
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>
      </div>
    </div>
  );
};

export default DashboardMockup;
