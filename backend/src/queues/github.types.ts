export interface GitHubRepositoryReviewJob {
  reviewId: string;
  userId: string;
  repositoryUrl: string;
  owner: string;
  repository: string;
  repositoryId: number;
}
