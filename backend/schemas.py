from typing import List, Optional

from pydantic import BaseModel


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
