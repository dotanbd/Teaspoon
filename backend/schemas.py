import re
from typing import List, Optional

from pydantic import BaseModel, field_validator


class AssignmentCreate(BaseModel):
    title: str
    course_code: str
    type: str
    deadline: str
    recommended_deadline: Optional[str] = None


class CourseUpdate(BaseModel):
    name: str
    hw_weight: int = 0
    hw_keep: int = 0
    ww_weight: int = 0
    ww_keep: int = 0
    exam_weight: int = 0
    lab_report_weight: Optional[int] = 0
    lab_report_keep: Optional[int] = 0
    hw_magen: bool = False
    ww_magen: bool = False
    exam_magen: bool = False
    lab_report_magen: Optional[bool] = False


class AttachmentUpdate(BaseModel):
    filename: str


class SemesterOut(BaseModel):
    code: str
    name: str
    term: str
    year: int
    position: int
    is_active: bool


class AdvanceSemesterPayload(BaseModel):
    new_semester_code: str  # e.g., "2026_SUMMER"
    new_semester_name: str  # e.g., "סמסטר קיץ תשפ\"ו"
    term: str               # "SUMMER"
    year: int               # 2026


class GradeUpdate(BaseModel):
    grade: Optional[int]


class CourseCodeUpdate(BaseModel):
    new_code: str


class ProgressUpdateReq(BaseModel):
    is_redo: bool
    is_pass_fail: bool = False
    credits: float
    new_score: Optional[float] = None
    old_score: Optional[float] = None
    old_was_pass_fail: bool = False


class UpdateVersionRequest(BaseModel):
    version: int


class MoodleSyncRequest(BaseModel):
    ics_url: str


class MergeAssignmentsRequest(BaseModel):
    target_id: int
    source_id: int


class ChangelogFeature(BaseModel):
    icon: str
    title: str
    desc: str


class ChangelogPayload(BaseModel):
    version: int
    date_str: str
    title: str
    features: List[ChangelogFeature]


class RoleUpdate(BaseModel):
    role: str


class GradeCreate(BaseModel):
    course_code: str
    course_name: str
    credits: float
    score: Optional[float] = None
    is_pass_fail: bool = False

    @field_validator('course_code')
    def validate_course_code(cls, value):
        if not re.match(r"^\d{3}0\d{3}$", value):
            raise ValueError('Course code must be exactly 7 digits (XXX0XXX)')
        return value
