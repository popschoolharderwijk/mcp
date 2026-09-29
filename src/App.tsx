import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemedToaster } from './components/ThemedToaster';
import { ThemeProvider } from './components/ThemeProvider';
import Account from './pages/Account';
import AccountingReport from './pages/AccountingReport';
import AccountingSettingsPage from './pages/AccountingSettingsPage';
import Agenda from './pages/Agenda';
import Agreements from './pages/Agreements';
import AgreementWizard from './pages/AgreementWizard';
import Announcements from './pages/Announcements';
import AuthCallback from './pages/AuthCallback';
import AuthConfirm from './pages/AuthConfirm';
import Dashboard from './pages/Dashboard';
import DirectDebit from './pages/DirectDebit';
import DirectDebitBatchDetail from './pages/DirectDebitBatchDetail';
import DirectDebitStart from './pages/DirectDebitStart';
import EmailTemplates from './pages/EmailTemplates';
import Invoices from './pages/Invoices';
import LegacyImport from './pages/LegacyImport';
import LessonGroups from './pages/LessonGroups';
import LessonGroupWizard from './pages/LessonGroupWizard';
import LessonTypeInfo from './pages/LessonTypeInfo';
import LessonTypes from './pages/LessonTypes';
import Login from './pages/Login';
import Mandates from './pages/Mandates';
import MyAvailability from './pages/MyAvailability';
import MyInvoices from './pages/MyInvoices';
import MyStatistics from './pages/MyStatistics';
import MyStudentProfile from './pages/MyStudentProfile';
import MyStudents from './pages/MyStudents';
import MyTrial from './pages/MyTrial';
import NoLessonPeriods from './pages/NoLessonPeriods';
import NotFound from './pages/NotFound';
import Projects from './pages/Projects';
import PublicSignup from './pages/PublicSignup';
import Reports from './pages/Reports';
import SignupRequests from './pages/SignupRequests';
import StudentDetail from './pages/StudentDetail';
import Students from './pages/Students';

import TeacherAvailability from './pages/TeacherAvailability';
import TeacherInfo from './pages/TeacherInfo';
import Teachers from './pages/Teachers';
import TrialLessons from './pages/TrialLessons';
import UserManual from './pages/UserManual';
import Users from './pages/Users';

const App = () => (
	<BrowserRouter
		future={{
			v7_startTransition: true,
			v7_relativeSplatPath: true,
		}}
	>
		<ThemeProvider defaultTheme="system">
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/auth/callback" element={<AuthCallback />} />
					<Route path="/auth/confirm" element={<AuthConfirm />} />
					<Route path="/signup" element={<PublicSignup />} />
					<Route path="/direct-debit/start" element={<DirectDebitStart />} />

					{/* Protected dashboard routes */}
					<Route
						element={
							<ProtectedRoute>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route path="/" element={<Dashboard />} />
						<Route path="/agenda" element={<Agenda />} />
						<Route path="/users" element={<Users />} />
						<Route path="/lesson-types" element={<LessonTypes />} />
						<Route path="/lesson-types/new" element={<LessonTypeInfo />} />
						<Route path="/lesson-types/:id" element={<LessonTypeInfo />} />
						<Route path="/agreements" element={<Agreements />} />
						<Route path="/lesson-groups" element={<LessonGroups />} />
						<Route path="/lesson-groups/new" element={<LessonGroupWizard />} />
						<Route path="/lesson-groups/:id" element={<LessonGroupWizard />} />
						<Route path="/agreements/new" element={<AgreementWizard />} />
						<Route path="/agreements/:id" element={<AgreementWizard />} />
						<Route path="/signup-requests" element={<SignupRequests />} />
						<Route path="/trial-lessons" element={<TrialLessons />} />
						<Route path="/my-trial" element={<MyTrial />} />

						<Route path="/no-lesson-periods" element={<NoLessonPeriods />} />
						<Route path="/email-templates" element={<EmailTemplates />} />
						<Route path="/account" element={<Account defaultTab="profile" />} />
						<Route path="/account/profile" element={<Account defaultTab="profile" />} />
						<Route path="/account/appearance" element={<Account defaultTab="appearance" />} />
						<Route path="/account/danger" element={<Account defaultTab="danger" />} />
						<Route path="/projects" element={<Projects />} />
						<Route path="/teachers" element={<Teachers />} />
						<Route path="/teachers/availability" element={<TeacherAvailability />} />
						<Route path="/teachers/my-profile" element={<TeacherInfo />} />
						<Route path="/teachers/my-availability" element={<MyAvailability />} />
						<Route path="/teachers/my-statistics" element={<MyStatistics />} />
						<Route path="/teachers/:id" element={<TeacherInfo />} />
						<Route path="/students" element={<Students />} />
						<Route path="/students/my-students" element={<MyStudents />} />
						<Route path="/students/my-profile" element={<MyStudentProfile />} />
						<Route path="/students/:userId" element={<StudentDetail />} />
						<Route path="/reports" element={<Reports />} />
						<Route path="/accounting" element={<AccountingReport />} />
						<Route path="/accounting/settings" element={<AccountingSettingsPage />} />
						<Route path="/direct-debit" element={<DirectDebit />} />
						<Route path="/direct-debit/batches/:id" element={<DirectDebitBatchDetail />} />
						<Route path="/mandates" element={<Mandates />} />
						<Route path="/invoices" element={<Invoices />} />
						<Route path="/my-invoices" element={<MyInvoices />} />
						<Route path="/data-import" element={<LegacyImport />} />
						<Route path="/announcements" element={<Announcements />} />
						<Route path="/manual" element={<UserManual />} />
					</Route>

					<Route path="*" element={<NotFound />} />
				</Routes>
				<ThemedToaster />
			</AuthProvider>
		</ThemeProvider>
	</BrowserRouter>
);

export default App;
