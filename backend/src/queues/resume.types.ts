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
