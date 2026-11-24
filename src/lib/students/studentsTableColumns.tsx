import type { NavigateFunction } from 'react-router-dom';
import { LessonAgreementItem } from '@/components/students/LessonAgreementItem';
import type { SignupRequestDetail } from '@/components/students/SignupRequestDialog';
import { Badge } from '@/components/ui/badge';
import type { DataTableColumn } from '@/components/ui/data-table';
import { UserDisplay } from '@/components/ui/user-display';
import { collectMyStudentLessonTypes } from '@/lib/students/myStudentsPageHelpers';
import { buildStudentDetailPath } from '@/lib/students/studentInfoTabsHelpers';
import {
	formatAgreementListCount,
	formatSignupRequestCount,
	getStudentActiveStatusLabel,
} from '@/lib/students/studentsPageHelpers';
import type { StudentWithAgreements } from '@/types/students';

const STUDENT_SORT_COLUMNS: Record<string, string> = {
	student: 'name',
	phone_number: 'phone_number',
	status: 'status',
	agreements: 'agreements',
};

export function mapStudentSortColumn(sortColumn: string | null): string {
	if (!sortColumn) return 'name';
	return STUDENT_SORT_COLUMNS[sortColumn] ?? 'name';
}

function renderStudentIdentity(student: StudentWithAgreements) {
	return <UserDisplay profile={student} showEmail />;
}

function renderStudentPhone(student: StudentWithAgreements) {
	return <span className="text-muted-foreground">{student.phone_number || '-'}</span>;
}

function renderMyStudentLessonTypes(student: StudentWithAgreements) {
	const lessonTypes = collectMyStudentLessonTypes(student);
	if (lessonTypes.length === 0) {
		return <span className="text-muted-foreground text-sm">-</span>;
	}

	return (
		<div className="flex flex-wrap gap-1">
			{lessonTypes.map((lessonType) => (
				<Badge key={lessonType.key} variant="secondary" className="text-xs">
					{lessonType.name}
				</Badge>
			))}
		</div>
	);
}

function renderMyStudentAgreements(student: StudentWithAgreements) {
	if (student.agreements.length === 0) {
		return <span className="text-muted-foreground text-sm">-</span>;
	}

	return (
		<div className="flex flex-wrap gap-2">
			{student.agreements.map((agreement) => (
				<LessonAgreementItem key={agreement.id} agreement={agreement} className="flex-shrink-0" />
			))}
		</div>
	);
}

export function buildStudentColumns(
	navigate: NavigateFunction,
	requestsByEmail: Map<string, SignupRequestDetail[]>,
): DataTableColumn<StudentWithAgreements>[] {
	return [
		{
			key: 'student',
			label: 'Leerling',
			sortable: true,
			className: 'w-64 max-w-64 min-w-0',
			render: renderStudentIdentity,
		},
		{
			key: 'phone_number',
			label: 'Telefoon',
			sortable: true,
			render: renderStudentPhone,
			className: 'text-muted-foreground w-32',
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (s) => (
				<Badge variant={s.active_agreements_count > 0 ? 'default' : 'secondary'}>
					{getStudentActiveStatusLabel(s.active_agreements_count)}
				</Badge>
			),
			className: 'w-24',
		},
		{
			key: 'agreements',
			label: 'Overeenkomsten',
			sortable: true,
			render: (s) => (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						navigate(buildStudentDetailPath(s.user_id, 'agreements'));
					}}
					className="text-sm"
				>
					{formatAgreementListCount(s.agreements_count)}
				</button>
			),
		},
		{
			key: 'signup_requests',
			label: 'Aanmeldingen',
			render: (s) => {
				const count = s.email ? (requestsByEmail.get(s.email)?.length ?? 0) : 0;
				return (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							navigate(buildStudentDetailPath(s.user_id, 'signups'));
						}}
						className="text-sm"
					>
						{formatSignupRequestCount(count)}
					</button>
				);
			},
		},
	];
}

export function buildMyStudentColumns(): DataTableColumn<StudentWithAgreements>[] {
	return [
		{
			key: 'student',
			label: 'Leerling',
			sortable: false,
			className: 'w-56',
			render: renderStudentIdentity,
		},
		{
			key: 'phone_number',
			label: 'Telefoon',
			sortable: false,
			render: renderStudentPhone,
			className: 'text-muted-foreground',
		},
		{
			key: 'lesson_types',
			label: 'Lessoorten',
			sortable: false,
			render: renderMyStudentLessonTypes,
		},
		{
			key: 'agreements',
			label: 'Lesovereenkomsten',
			sortable: false,
			className: 'min-w-96',
			render: renderMyStudentAgreements,
		},
	];
}
