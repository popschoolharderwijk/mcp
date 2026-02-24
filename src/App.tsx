import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './components/AuthProvider';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ThemeProvider } from './components/ThemeProvider';
import Agreements from './pages/Agreements';
import AgreementWizard from './pages/AgreementWizard';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import LessonTypeInfo from './pages/LessonTypeInfo';
import LessonTypes from './pages/LessonTypes';
import Login from './pages/Login';
import MyAvailability from './pages/MyAvailability';
import MyStatistics from './pages/MyStatistics';
import MyStudentProfile from './pages/MyStudentProfile';
import MyStudents from './pages/MyStudents';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import Students from './pages/Students';
import TeacherAvailability from './pages/TeacherAvailability';
import TeacherInfo from './pages/TeacherInfo';
import Teachers from './pages/Teachers';
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

					{/* Protected dashboard routes */}
					<Route
						element={
							<ProtectedRoute>
								<DashboardLayout />
							</ProtectedRoute>
						}
					>
						<Route path="/" element={<Dashboard />} />
						<Route path="/users" element={<Users />} />
						<Route path="/lesson-types" element={<LessonTypes />} />
						<Route path="/lesson-types/new" element={<LessonTypeInfo />} />
						<Route path="/lesson-types/:id" element={<LessonTypeInfo />} />
						<Route path="/agreements" element={<Agreements />} />
						<Route path="/agreements/new" element={<AgreementWizard />} />
						<Route path="/agreements/:id" element={<AgreementWizard />} />
						<Route path="/settings" element={<Settings />} />
						<Route path="/teachers" element={<Teachers />} />
						<Route path="/teachers/availability" element={<TeacherAvailability />} />
						<Route path="/teachers/my-profile" element={<TeacherInfo />} />
						<Route path="/teachers/my-availability" element={<MyAvailability />} />
						<Route path="/teachers/my-statistics" element={<MyStatistics />} />
						<Route path="/teachers/:id" element={<TeacherInfo />} />
						<Route path="/students" element={<Students />} />
						<Route path="/students/my-students" element={<MyStudents />} />
						<Route path="/students/my-profile" element={<MyStudentProfile />} />
					</Route>

					<Route path="*" element={<NotFound />} />
				</Routes>
				<Toaster />
			</AuthProvider>
		</ThemeProvider>
	</BrowserRouter>
);

export default App;
