export interface ResumeSearchJob {
  searchId: string;
  userId: string;
}
export interface ResumeAttachmentJob {
  searchId: string;
  applicantId: string;
  userId: string;
  gmailMessageId: string;
  gmailAttachmentId: string;
}

export interface ResumePdfDeletionJob {
  searchId: string;
  applicantId: string;
  userId: string;
  publicId: string;
}

export interface ResumeAtsScanJob {
  searchId: string;
  applicantId: string;
  userId: string;
}
