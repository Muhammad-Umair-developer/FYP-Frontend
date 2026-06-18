// ============================================================
//  Shared TypeScript types derived from the backend API contracts
//  (README.md) — single source of truth for all response shapes.
// ============================================================

// --------------- Auth ---------------
export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
}

// --------------- Students ---------------
export interface Student {
  student_id: string;
  name: string;
  reg_number: string;
  image_paths: string[];
  class_name?: string;
  created_at?: string;
}

export interface StudentsListResponse {
  students: Student[];
  count: number;
}

export interface StudentSearchResponse {
  results: Pick<Student, "student_id" | "name">[];
  count: number;
}

export interface StudentRegisterResponse {
  message: string;
  student_id: string;
  name: string;
  class_name: string;
  collection_name: string;
  image_paths: string[];
}

export interface StudentEnrollResponse {
  message: string;
  student_id: string;
  name: string;
  images_saved: number;
}

export interface StudentMutationResponse {
  message: string;
  student_id: string;
}

// --------------- Attendance ---------------
export type AttendanceStatus = "Present" | "Absent" | "Late";

export interface AttendanceRecord {
  _id: string;
  student_id: string;
  name: string;
  date: string; // ISO 8601
  status: AttendanceStatus;
  confidence: number;
  class_name?: string;
  course_name?: string;
  course_code?: string;
}

export interface AttendanceListResponse {
  records: AttendanceRecord[];
  count: number;
}

export interface AttendanceMarkPayload {
  student_id: string;
  name: string;
  status: AttendanceStatus;
  confidence: number;
}

export interface AttendanceMarkResponse {
  message: string;
  student_id: string;
  date: string;
}

export interface AttendanceMutationResponse {
  message: string;
  attendance_id: string;
}

// --------------- Mark From Image ---------------
export type FaceMatchStatus = "newly_marked" | "already_marked" | "unknown";

export interface FaceMatch {
  face_number: number;
  bbox: [number, number, number, number];
  confidence: number;
  student_id: string;
  name: string;
  status: FaceMatchStatus;
  already_marked: boolean;
  message: string;
}

export interface MarkFromImageResponse {
  message: string;
  results: FaceMatch[];
  processed_by: string;
  timestamp: string;
}

// --------------- Subjects / Courses ---------------
export interface Course {
  course_name: string;
  course_code: string;
}

export type DegreeEnum = "BSCS" | "BSSE" | "BSAI";

export interface SubjectCreatePayload {
  degree: DegreeEnum;
  semester: number;
  course_name: string;
  course_code: string;
}

// --------------- Student Identify ---------------
export interface IdentifyResponse {
  name: string;
  student_id: string;
  class_name?: string;
  reg_number?: string;
  confidence?: number;
  message?: string;
}

// --------------- Classes ---------------
export interface ClassCreatePayload {
  class_name: string;
}

export interface ClassCreateResponse {
  message: string;
  class_name: string;
  collection_name: string;
  created: boolean;
}

// --------------- WebSocket Messages ---------------

/** Client → Server */
export interface WsFrameMessage {
  type: "frame";
  data: string; // base64-encoded JPG
  timestamp: string; // ISO 8601
}

export interface WsPingMessage {
  type: "ping";
}

export interface WsEndMessage {
  type: "end";
}

export type WsClientMessage = WsFrameMessage | WsPingMessage | WsEndMessage;

/** Server → Client */
export interface WsMatchResult {
  student_id: string;
  name: string;
  confidence: number;
  bbox: [number, number, number, number];
  status: FaceMatchStatus;
}

export interface WsMatchResultMessage {
  type: "match_result";
  timestamp: string;
  faces_detected: number;
  newly_marked: number;
  marked_today: number;
  matches: WsMatchResult[];
}

export interface WsPongMessage {
  type: "pong";
}

export interface WsErrorMessage {
  type: "error";
  message: string;
}

export type WsServerMessage = WsMatchResultMessage | WsPongMessage | WsErrorMessage;

// --------------- System ---------------
export interface HealthResponse {
  status: "healthy" | "unhealthy";
}

export interface ApiInfoResponse {
  version: string;
  base_path: string;
  endpoints?: Record<string, string>;
}
