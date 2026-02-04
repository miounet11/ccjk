/**
 * Skills API Client for api.claudehome.cn
 * Handles skill CRUD operations
 */

import type {
  ListOptions,
  SkillDetails,
  SkillList,
  UpdateSkillRequest,
  UploadSkillRequest,
  UploadSkillResponse,
} from './types.js'
import { APIClient } from './client.js'
import { API_PATHS } from './config.js'

export class SkillsAPIClient extends APIClient {
  /**
   * Upload a new skill
   */
  async uploadSkill(request: UploadSkillRequest): Promise<UploadSkillResponse> {
    // Create form data for file upload
    const formData = new FormData()

    // Add metadata
    formData.append('name', request.name)
    formData.append('description', request.description)
    formData.append('version', request.version)
    formData.append('language', request.language)
    formData.append('isPublic', String(request.isPublic))

    if (request.category) {
      formData.append('category', request.category)
    }

    if (request.tags && request.tags.length > 0) {
      formData.append('tags', JSON.stringify(request.tags))
    }

    if (request.dependencies && request.dependencies.length > 0) {
      formData.append('dependencies', JSON.stringify(request.dependencies))
    }

    // Add file content
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(request.content)) {
      const uint8Array = new Uint8Array(request.content)
      const blob = new Blob([uint8Array], { type: 'application/octet-stream' })
      formData.append('file', blob, `${request.name}.md`)
    }
    else if (request.content instanceof Uint8Array) {
      const blob = new Blob([request.content], { type: 'application/octet-stream' })
      formData.append('file', blob, `${request.name}.md`)
    }
    else {
      formData.append('file', new Blob([request.content], { type: 'text/markdown' }), `${request.name}.md`)
    }

    return this.upload<UploadSkillResponse>(API_PATHS.SKILLS, formData as any)
  }

  /**
   * Get skill details by ID
   */
  async getSkill(skillId: string): Promise<SkillDetails> {
    return this.get<SkillDetails>(API_PATHS.SKILL_DETAILS(skillId))
  }

  /**
   * Update an existing skill
   */
  async updateSkill(skillId: string, updates: UpdateSkillRequest): Promise<void> {
    await this.patch(API_PATHS.SKILL_UPDATE(skillId), updates)
  }

  /**
   * Update skill content
   */
  async updateSkillContent(
    skillId: string,
    content: string | Buffer,
    version?: string,
  ): Promise<void> {
    const formData = new FormData()

    if (version) {
      formData.append('version', version)
    }

    if (Buffer.isBuffer(content)) {
      const blob = new Blob([new Uint8Array(content)], { type: 'application/octet-stream' })
      formData.append('file', blob)
    }
    else {
      formData.append('file', new Blob([content], { type: 'text/markdown' }))
    }

    await this.upload<void>(API_PATHS.SKILL_UPDATE(skillId), formData as any, {
      method: 'POST',
    })
  }

  /**
   * Delete a skill
   */
  async deleteSkill(skillId: string): Promise<void> {
    await this.delete(API_PATHS.SKILL_DELETE(skillId))
  }

  /**
   * Download skill content
   */
  async downloadSkill(skillId: string): Promise<Buffer> {
    return this.download(API_PATHS.SKILL_DOWNLOAD(skillId))
  }

  /**
   * Download skill as string
   */
  async downloadSkillText(skillId: string): Promise<string> {
    const buffer = await this.downloadSkill(skillId)
    return buffer.toString('utf-8')
  }

  /**
   * List skills for a user
   */
  async listUserSkills(userId: string, options?: ListOptions): Promise<SkillList> {
    return this.get<SkillList>(API_PATHS.SKILLS_USER(userId), { params: options })
  }

  /**
   * List all skills (with optional filtering)
   */
  async listSkills(options?: ListOptions): Promise<SkillList> {
    return this.get<SkillList>(API_PATHS.SKILLS, { params: options })
  }

  /**
   * Publish a skill (make it public)
   */
  async publishSkill(skillId: string): Promise<void> {
    await this.patch(API_PATHS.SKILL_UPDATE(skillId), { isPublic: true })
  }

  /**
   * Unpublish a skill (make it private)
   */
  async unpublishSkill(skillId: string): Promise<void> {
    await this.patch(API_PATHS.SKILL_UPDATE(skillId), { isPublic: false })
  }

  /**
   * Increment skill download count
   */
  async recordDownload(skillId: string): Promise<void> {
    await this.post(`${API_PATHS.SKILL_DETAILS(skillId)}/download`, {})
  }

  /**
   * Increment skill view count
   */
  async recordView(skillId: string): Promise<void> {
    await this.post(`${API_PATHS.SKILL_DETAILS(skillId)}/view`, {})
  }

  /**
   * Batch upload multiple skills
   */
  async batchUploadSkills(requests: UploadSkillRequest[]): Promise<UploadSkillResponse[]> {
    const results: UploadSkillResponse[] = []

    for (const request of requests) {
      try {
        const result = await this.uploadSkill(request)
        results.push(result)
      }
      catch (error) {
        console.error(`Failed to upload skill: ${request.name}`, error)
        results.push({
          skillId: '',
          version: request.version,
          downloadUrl: '',
          publishedAt: new Date().toISOString(),
        })
      }
    }

    return results
  }

  /**
   * Search skills by name, tags, or category
   */
  async searchSkills(query: {
    search?: string
    category?: string
    tags?: string[]
    language?: string
    isPublic?: boolean
    page?: number
    pageSize?: number
  }): Promise<SkillList> {
    return this.get<SkillList>(API_PATHS.SKILLS, { params: query })
  }

  /**
   * Get skill versions
   */
  async getSkillVersions(skillId: string): Promise<string[]> {
    const response = await this.get<{ versions: string[] }>(
      `${API_PATHS.SKILL_DETAILS(skillId)}/versions`,
    )
    return response.versions
  }

  /**
   * Clone a skill (create a copy)
   */
  async cloneSkill(skillId: string, newName: string): Promise<UploadSkillResponse> {
    return this.post<UploadSkillResponse>(
      `${API_PATHS.SKILL_DETAILS(skillId)}/clone`,
      { name: newName },
    )
  }

  /**
   * Export skill metadata
   */
  async exportSkillMetadata(skillId: string): Promise<{
    skill: SkillDetails
    exportedAt: string
  }> {
    const skill = await this.getSkill(skillId)
    return {
      skill,
      exportedAt: new Date().toISOString(),
    }
  }

  /**
   * Import skill from URL
   */
  async importSkillFromUrl(url: string): Promise<UploadSkillResponse> {
    return this.post<UploadSkillResponse>(`${API_PATHS.SKILLS}/import`, { url })
  }

  /**
   * Validate skill before upload
   */
  async validateSkill(request: Partial<UploadSkillRequest>): Promise<{
    valid: boolean
    errors: string[]
  }> {
    return this.post<{ valid: boolean, errors: string[] }>(
      `${API_PATHS.SKILLS}/validate`,
      request,
    )
  }

  /**
   * Get skill dependencies
   */
  async getSkillDependencies(skillId: string): Promise<string[]> {
    const skill = await this.getSkill(skillId)
    return skill.dependencies
  }

  /**
   * Resolve skill dependencies
   */
  async resolveDependencies(skillId: string): Promise<{
    resolved: Record<string, string>
    missing: string[]
  }> {
    return this.get<{ resolved: Record<string, string>, missing: string[] }>(
      `${API_PATHS.SKILL_DETAILS(skillId)}/dependencies/resolve`,
    )
  }

  /**
   * Rate a skill
   */
  async rateSkill(skillId: string, rating: number): Promise<void> {
    await this.post(`${API_PATHS.SKILL_DETAILS(skillId)}/rate`, { rating })
  }

  /**
   * Add tags to a skill
   */
  async addSkillTags(skillId: string, tags: string[]): Promise<void> {
    await this.post(`${API_PATHS.SKILL_DETAILS(skillId)}/tags`, { tags })
  }

  /**
   * Remove tags from a skill
   */
  async removeSkillTags(skillId: string, tags: string[]): Promise<void> {
    await this.delete(`${API_PATHS.SKILL_DETAILS(skillId)}/tags`, {
      body: { tags },
    })
  }

  /**
   * Transfer skill ownership
   */
  async transferSkillOwnership(skillId: string, newOwnerId: string): Promise<void> {
    await this.post(`${API_PATHS.SKILL_DETAILS(skillId)}/transfer`, {
      newOwnerId,
    })
  }
}

/**
 * Factory function to create Skills API client
 */
export function createSkillsClient(config?: import('./client.js').ClientConfig): SkillsAPIClient {
  return new SkillsAPIClient(config)
}
