import { Component, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface RorOrganization {
  id: string;
  names: Array<{ value: string; types: string[] }>;
  status: string;
  locations: Array<{ geonames_details: { country_name: string } }>;
}

interface RorSearchResponse {
  number_of_results: number;
  items: RorOrganization[];
}

interface TestCase {
  id: string;
  name: string;
  method: string;
  endpoint: string;
  description: string;
  triggersPreflightBecause?: string;
  headers?: Record<string, string>;
  body?: any;
  status: 'pending' | 'success' | 'error';
  statusCode?: number;
  message?: string;
  duration?: number;
  corsHeaders?: Record<string, string>;
  data?: any;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main>
      <section class="hero">
        <h1>ROR API v2 CORS Test</h1>
      </section>

      <section class="panel">
        <div class="input-row">
          <input
            type="text"
            [value]="searchQuery"
            (input)="searchQuery = $any($event.target).value"
            placeholder="Enter search term (e.g., 'Harvard')"
          />
          <button class="action-button primary" (click)="runAllTests()" [disabled]="isLoading">
            {{ isLoading ? 'Testing...' : 'Run All CORS Tests' }}
          </button>
        </div>
      </section>

      <section class="results-panel">
        <h2>Test Results</h2>
        <p class="hint">Check browser DevTools Network tab to inspect preflight requests</p>

        <div class="test-groups">
          @for (group of testGroups; track group.name) {
            <div class="test-group">
              <h3 class="group-title">{{ group.name }}</h3>
              <div class="results-grid">
                @for (test of getTestsForGroup(group.name); track test.id) {
                  <div class="result-card"
                       [class.success]="test.status === 'success'"
                       [class.error]="test.status === 'error'"
                       [class.pending]="test.status === 'pending'">
                    <div class="result-header">
                      <span class="method-badge" [class]="'method-' + test.method.toLowerCase()">{{ test.method }}</span>
                      <span class="status-badge"
                            [class.success]="test.status === 'success'"
                            [class.error]="test.status === 'error'">
                        {{ test.status === 'pending' ? 'Pending' : test.status === 'success' ? 'Success' : 'Failed' }}
                      </span>
                    </div>
                    <p class="test-name">{{ test.name }}</p>
                    <p class="endpoint">{{ test.endpoint }}</p>
                    <p class="description">{{ test.description }}</p>
                    @if (test.triggersPreflightBecause) {
                      <p class="preflight-note">Triggers preflight: {{ test.triggersPreflightBecause }}</p>
                    }
                    @if (test.status !== 'pending') {
                      <div class="result-details">
                        <span class="detail">Status: {{ test.statusCode || 0 }}</span>
                        @if (test.duration) {
                          <span class="detail">{{ test.duration }}ms</span>
                        }
                      </div>
                      @if (test.message) {
                        <p class="message" [class.error-message]="test.status === 'error'">{{ test.message }}</p>
                      }
                      @if (test.corsHeaders && (test.corsHeaders | keyvalue).length > 0) {
                        <div class="cors-headers">
                          <strong>CORS Headers:</strong>
                          @for (header of test.corsHeaders | keyvalue; track header.key) {
                            <div class="cors-header">{{ header.key }}: {{ header.value }}</div>
                          }
                        </div>
                      }
                      @if (test.status === 'success' && test.data?.items) {
                        <div class="data-preview">
                          <strong>Results:</strong> {{ test.data.number_of_results }} found
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </section>

    </main>
  `,
  styles: [`
    main {
      width: min(1100px, 100%);
      padding: 2rem clamp(1rem, 4vw, 3rem) 4rem;
      margin: 0 auto;
    }

    .hero {
      margin-bottom: 2rem;
      text-align: center;
    }

    .hero h1 {
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 700;
      color: var(--text);
      margin: 0;
    }

    .panel {
      margin-bottom: 2rem;
    }

    .input-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    input[type="text"] {
      flex: 1;
      min-width: 200px;
      max-width: 400px;
      padding: 0.9rem 1.1rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: #ffffff;
      color: var(--text);
      font-size: 1rem;
      font-family: inherit;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: var(--accent);
    }

    .action-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
      background: #ffffff;
      color: var(--text);
      padding: 0.9rem 1.5rem;
      border-radius: 999px;
      font-size: 1rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease, border 0.2s ease;
    }

    .action-button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #fdfdfd;
    }

    .action-button.primary:hover:not(:disabled) {
      background: var(--accent-dark);
      border-color: var(--accent-dark);
    }

    .action-button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .results-panel {
      margin-bottom: 2rem;
    }

    .results-panel h2 {
      font-size: 1.2rem;
      font-weight: 600;
      margin: 0 0 0.5rem;
    }

    .hint {
      color: var(--muted);
      font-size: 0.9rem;
      margin: 0 0 1.5rem;
    }

    .test-groups {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .test-group {
      border-top: 1px solid var(--border);
      padding-top: 1.5rem;
    }

    .group-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0 0 1rem;
    }

    .results-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .result-card {
      border: 1px solid var(--border);
      border-radius: 1rem;
      padding: 1rem 1.25rem;
      background: #fafafa;
    }

    .result-card.success {
      background: var(--neutral-chip);
      border-color: var(--accent);
    }

    .result-card.error {
      background: var(--error-bg);
      border-color: var(--error);
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .method-badge {
      background: var(--text);
      color: #fff;
      padding: 0.2rem 0.6rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }

    .method-badge.method-get { background: #2f9f91; }
    .method-badge.method-post { background: #4a90d9; }
    .method-badge.method-put { background: #d97706; }
    .method-badge.method-delete { background: #dc2626; }
    .method-badge.method-head { background: #7c3aed; }
    .method-badge.method-options { background: #6b7280; }

    .status-badge {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--muted);
    }

    .status-badge.success { color: var(--accent-dark); }
    .status-badge.error { color: var(--error); }

    .test-name {
      font-weight: 600;
      font-size: 0.95rem;
      margin: 0 0 0.25rem;
      color: var(--text);
    }

    .endpoint {
      font-size: 0.8rem;
      color: var(--muted);
      margin: 0 0 0.25rem;
      word-break: break-all;
      font-family: monospace;
    }

    .description {
      font-size: 0.85rem;
      color: var(--muted);
      margin: 0 0 0.5rem;
    }

    .preflight-note {
      font-size: 0.8rem;
      color: var(--accent-dark);
      background: var(--neutral-chip);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      margin: 0 0 0.5rem;
      display: inline-block;
    }

    .result-details {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 0.5rem;
    }

    .message {
      font-size: 0.9rem;
      margin: 0.5rem 0 0;
      color: var(--text);
    }

    .error-message {
      color: var(--error);
    }

    .cors-headers {
      font-size: 0.8rem;
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(255,255,255,0.7);
      border-radius: 0.5rem;
      font-family: monospace;
    }

    .cors-header {
      color: var(--muted);
      word-break: break-all;
    }

    .data-preview {
      font-size: 0.85rem;
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: rgba(255,255,255,0.5);
      border-radius: 0.5rem;
    }

  `]
})
export class AppComponent {
  private http = inject(HttpClient);

  searchQuery = 'Harvard';
  isLoading = false;
  tests: TestCase[] = [];

  private readonly API_BASE = 'https://api.ror.org/v2';
  private readonly SAMPLE_ROR_ID = 'https://ror.org/03vek6s52';

  readonly testGroups = [
    { name: 'Simple Requests (No Preflight)' },
    { name: 'Requests That Trigger Preflight (Allowed Headers)' },
    { name: 'Requests That Trigger Preflight (Blocked)' },
    { name: 'Write Operations (Require Auth)' }
  ];

  getTestsForGroup(groupName: string): TestCase[] {
    const groupMap: Record<string, string[]> = {
      'Simple Requests (No Preflight)': ['simple-get-search', 'simple-get-record', 'simple-head', 'simple-options'],
      'Requests That Trigger Preflight (Allowed Headers)': ['get-content-type', 'get-authorization', 'post-json'],
      'Requests That Trigger Preflight (Blocked)': ['get-custom-header'],
      'Write Operations (Require Auth)': ['post-simple', 'put-json', 'delete']
    };
    return this.tests.filter(t => groupMap[groupName]?.includes(t.id));
  }

  runAllTests() {
    this.isLoading = true;
    const searchUrl = `${this.API_BASE}/organizations?query=${encodeURIComponent(this.searchQuery)}`;
    const recordUrl = `${this.API_BASE}/organizations/${encodeURIComponent(this.SAMPLE_ROR_ID)}`;

    this.tests = [
      {
        id: 'simple-get-search',
        name: 'GET Search',
        method: 'GET',
        endpoint: searchUrl,
        description: 'Simple GET request to search endpoint',
        status: 'pending'
      },
      {
        id: 'simple-get-record',
        name: 'GET Record',
        method: 'GET',
        endpoint: recordUrl,
        description: 'Simple GET request to fetch single record',
        status: 'pending'
      },
      {
        id: 'simple-head',
        name: 'HEAD Request',
        method: 'HEAD',
        endpoint: searchUrl,
        description: 'HEAD request (like GET but no body)',
        status: 'pending'
      },
      {
        id: 'simple-options',
        name: 'OPTIONS Request',
        method: 'OPTIONS',
        endpoint: searchUrl,
        description: 'Explicit OPTIONS request to check CORS headers',
        status: 'pending'
      },
      {
        id: 'get-content-type',
        name: 'GET + Content-Type',
        method: 'GET',
        endpoint: searchUrl,
        description: 'GET with Content-Type header (allowed)',
        triggersPreflightBecause: 'Content-Type header',
        headers: { 'Content-Type': 'application/json' },
        status: 'pending'
      },
      {
        id: 'get-authorization',
        name: 'GET + Authorization',
        method: 'GET',
        endpoint: searchUrl,
        description: 'GET with Authorization header (allowed)',
        triggersPreflightBecause: 'Authorization header',
        headers: { 'Authorization': 'Bearer test-token' },
        status: 'pending'
      },
      {
        id: 'post-json',
        name: 'POST + JSON',
        method: 'POST',
        endpoint: searchUrl,
        description: 'POST with Content-Type: application/json',
        triggersPreflightBecause: 'Content-Type: application/json',
        headers: { 'Content-Type': 'application/json' },
        body: { test: 'data' },
        status: 'pending'
      },
      {
        id: 'get-custom-header',
        name: 'GET + Custom Header (Blocked)',
        method: 'GET',
        endpoint: searchUrl,
        description: 'GET with X-Custom-Header (not in allowed list)',
        triggersPreflightBecause: 'Custom header not in Access-Control-Allow-Headers',
        headers: { 'X-Custom-Header': 'test-value' },
        status: 'pending'
      },
      {
        id: 'post-simple',
        name: 'POST Simple',
        method: 'POST',
        endpoint: searchUrl,
        description: 'Simple POST (no custom headers)',
        status: 'pending'
      },
      {
        id: 'put-json',
        name: 'PUT + JSON',
        method: 'PUT',
        endpoint: recordUrl,
        description: 'PUT request with JSON body',
        triggersPreflightBecause: 'PUT method + JSON content',
        headers: { 'Content-Type': 'application/json' },
        body: { test: 'data' },
        status: 'pending'
      },
      {
        id: 'delete',
        name: 'DELETE',
        method: 'DELETE',
        endpoint: recordUrl,
        description: 'DELETE request',
        triggersPreflightBecause: 'DELETE method',
        status: 'pending'
      }
    ];

    this.tests.forEach((test, index) => {
      this.runTest(test, index);
    });
  }

  private runTest(test: TestCase, index: number) {
    const startTime = performance.now();

    let headers = new HttpHeaders();
    if (test.headers) {
      Object.entries(test.headers).forEach(([key, value]) => {
        headers = headers.set(key, value);
      });
    }

    const options: any = {
      observe: 'response',
      responseType: test.method === 'HEAD' || test.method === 'OPTIONS' ? 'text' : 'json',
      headers
    };

    if (test.body) {
      options.body = test.body;
    }

    this.http.request(test.method, test.endpoint, options).subscribe({
      next: (response: any) => {
        const duration = Math.round(performance.now() - startTime);
        const corsHeaders: Record<string, string> = {};

        ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-max-age']
          .forEach(header => {
            const value = response.headers.get(header);
            if (value) corsHeaders[header] = value;
          });

        this.updateTest(index, {
          status: 'success',
          statusCode: response.status,
          duration,
          message: this.getSuccessMessage(test, response.body),
          corsHeaders,
          data: response.body
        });
        this.checkComplete();
      },
      error: (err: HttpErrorResponse) => {
        const duration = Math.round(performance.now() - startTime);
        this.updateTest(index, {
          status: 'error',
          statusCode: err.status || 0,
          duration,
          message: this.getErrorMessage(err)
        });
        this.checkComplete();
      }
    });
  }

  private getSuccessMessage(test: TestCase, body: any): string {
    if (test.method === 'GET' && body?.number_of_results !== undefined) {
      return `Found ${body.number_of_results} results`;
    }
    if (test.method === 'GET' && body?.id) {
      return `Fetched: ${this.getOrgName(body)}`;
    }
    if (test.method === 'HEAD') {
      return 'Headers received';
    }
    if (test.method === 'OPTIONS') {
      return 'CORS headers received';
    }
    return 'Request completed';
  }

  private getErrorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'CORS blocked - check console for details';
    }
    if (err.status === 403) {
      return 'Forbidden (authentication required)';
    }
    if (err.status === 405) {
      return 'Method not allowed';
    }
    return err.message || `Error: ${err.status}`;
  }

  private updateTest(index: number, updates: Partial<TestCase>) {
    this.tests[index] = { ...this.tests[index], ...updates };
  }

  private checkComplete() {
    if (this.tests.every(t => t.status !== 'pending')) {
      this.isLoading = false;
    }
  }

  private getOrgName(org: RorOrganization): string {
    const rorDisplay = org.names?.find(n => n.types?.includes('ror_display'));
    return rorDisplay?.value || org.names?.[0]?.value || 'Unknown';
  }
}
