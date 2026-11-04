import { Component, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InventoryApiService } from '../../core/services/inventory-api.service';
import { CopilotQueryResponse, CopilotAction } from '../../models/app.models';

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  response?: CopilotQueryResponse;
  timestamp: Date;
}

@Component({
  selector: 'app-ai-copilot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Floating Copilot Button -->
    <button class="copilot-floating-btn" (click)="toggleOpen()" [class.active]="isOpen">
      <span class="bot-icon">🤖</span>
      <span class="copilot-label">AI Copilot</span>
      <span class="status-pulse"></span>
    </button>

    <!-- Copilot Slide-Over Drawer Backdrop -->
    <div *ngIf="isOpen" class="copilot-backdrop" (click)="toggleOpen()"></div>

    <!-- Copilot Slide-Over Drawer -->
    <div class="copilot-drawer" [class.drawer-open]="isOpen">
      <!-- Header -->
      <div class="drawer-header">
        <div class="header-branding">
          <div class="avatar-ring">
            <span>🤖</span>
          </div>
          <div>
            <h3>Enterprise AI Copilot</h3>
            <span class="status-subtitle">
              <span class="live-dot"></span> Phase 1, 2 & 3 Autonomous AI Assistant
            </span>
          </div>
        </div>
        <button class="btn-close" (click)="toggleOpen()">✕</button>
      </div>

      <!-- Quick Suggestion Chips (at top) -->
      <div class="quick-chips-bar">
        <span class="chips-label">Quick Prompts:</span>
        <div class="chips-scroll">
          <button
            *ngFor="let prompt of quickPrompts"
            class="prompt-chip"
            (click)="sendPrompt(prompt)"
            [disabled]="isLoading"
          >
            {{ prompt }}
          </button>
        </div>
      </div>

      <!-- Chat Feed -->
      <div class="drawer-messages" #scrollContainer>
        <div *ngFor="let msg of messages" class="chat-message" [ngClass]="msg.sender">
          <div class="message-meta">
            <span class="message-sender">{{ msg.sender === 'user' ? 'You' : 'Copilot AI' }}</span>
            <span class="message-time">{{ msg.timestamp | date:'shortTime' }}</span>
          </div>

          <div class="message-bubble">
            <!-- Plain Text or Formatted Markdown Lines -->
            <div class="formatted-content" [innerHTML]="formatContent(msg.text)"></div>

            <!-- Action Buttons returned by Copilot -->
            <div *ngIf="msg.response?.suggestedActions?.length" class="action-buttons-wrap">
              <button
                *ngFor="let act of msg.response?.suggestedActions"
                class="copilot-action-btn"
                (click)="handleAction(act)"
              >
                <span>{{ act.icon }}</span> {{ act.label }} →
              </button>
            </div>

            <!-- Follow-up Questions -->
            <div *ngIf="msg.response?.followUpQuestions?.length" class="followup-wrap">
              <span class="followup-title">Suggested follow-ups:</span>
              <div class="followup-chips">
                <button
                  *ngFor="let f of msg.response?.followUpQuestions"
                  class="followup-chip"
                  (click)="sendPrompt(f)"
                >
                  💬 {{ f }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="isLoading" class="chat-message ai">
          <div class="message-meta">
            <span class="message-sender">Copilot AI</span>
          </div>
          <div class="message-bubble thinking-bubble">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-text">Querying inventory and orders...</span>
          </div>
        </div>
      </div>

      <!-- Footer Input -->
      <div class="drawer-footer">
        <form (ngSubmit)="submitQuery()" class="input-form">
          <input
            type="text"
            class="copilot-input"
            placeholder="Ask about low stock, orders, warehouses, products..."
            [(ngModel)]="userInput"
            name="copilotInput"
            [disabled]="isLoading"
            autocomplete="off"
          />
          <button type="submit" class="copilot-send-btn" [disabled]="!userInput.trim() || isLoading">
            ➤
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .copilot-floating-btn {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 1050;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 0.75rem 1.25rem;
      border-radius: 9999px;
      font-size: 0.9375rem;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.5), 0 8px 10px -6px rgba(79, 70, 229, 0.3);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .copilot-floating-btn:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 14px 28px -5px rgba(79, 70, 229, 0.6);
    }
    .bot-icon { font-size: 1.25rem; }
    .status-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    .copilot-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      z-index: 1055;
      animation: fadeIn 0.2s ease-out;
    }

    .copilot-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      max-width: 100vw;
      background: #ffffff;
      box-shadow: -8px 0 30px rgba(0, 0, 0, 0.15);
      z-index: 1060;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .drawer-open {
      transform: translateX(0);
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.15rem 1.25rem;
      background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
      color: #fff;
    }
    .header-branding {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .avatar-ring {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .drawer-header h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
    }
    .status-subtitle {
      font-size: 0.75rem;
      color: #c7d2fe;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 2px;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      background: #34d399;
      border-radius: 50%;
    }
    .btn-close {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .btn-close:hover { background: rgba(255, 255, 255, 0.25); }

    .quick-chips-bar {
      padding: 0.65rem 1.25rem;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .chips-label {
      font-size: 0.6875rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .chips-scroll {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .chips-scroll::-webkit-scrollbar { display: none; }
    .prompt-chip {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
      padding: 0.3rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
    }
    .prompt-chip:hover {
      border-color: #6366f1;
      color: #4f46e5;
      background: #eef2ff;
    }

    .drawer-messages {
      flex: 1;
      padding: 1rem 1.25rem;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      background: #fdfdfd;
      scroll-behavior: smooth;
    }

    .chat-message {
      display: flex;
      flex-direction: column;
      max-width: 95%;
      word-break: break-word;
    }
    .chat-message.user {
      align-self: flex-end;
      align-items: flex-end;
    }
    .chat-message.ai {
      align-self: flex-start;
      align-items: flex-start;
      max-width: 100%;
      width: 100%;
    }

    .message-meta {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      font-size: 0.6875rem;
      color: #94a3b8;
      margin-bottom: 0.25rem;
      padding: 0 0.25rem;
    }
    .message-sender { font-weight: 700; color: #475569; }

    .message-bubble {
      padding: 0.875rem 1.15rem;
      border-radius: 14px;
      font-size: 0.875rem;
      line-height: 1.5;
      max-width: 100%;
      box-sizing: border-box;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .chat-message.user .message-bubble {
      background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
      color: #ffffff;
      border-bottom-right-radius: 3px;
    }
    .chat-message.ai .message-bubble {
      background: #f1f5f9;
      color: #1e293b;
      border-bottom-left-radius: 3px;
      border: 1px solid #e2e8f0;
      width: 100%;
    }

    .formatted-content ::ng-deep h3 {
      font-size: 0.9375rem;
      margin: 0.25rem 0 0.65rem 0;
      color: #1e1b4b;
    }
    .formatted-content ::ng-deep .table-scroll-wrapper {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      margin: 0.65rem 0;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
      -webkit-overflow-scrolling: touch;
    }
    .formatted-content ::ng-deep table {
      width: 100%;
      min-width: 440px;
      border-collapse: collapse;
      font-size: 0.75rem;
      background: #fff;
      border: none;
      margin: 0;
    }
    .formatted-content ::ng-deep th,
    .formatted-content ::ng-deep td {
      padding: 0.4rem 0.5rem;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .formatted-content ::ng-deep th {
      background: #f8fafc;
      font-weight: 700;
      color: #475569;
    }
    .formatted-content ::ng-deep code {
      background: #e2e8f0;
      padding: 0.15rem 0.35rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.8em;
    }
    .formatted-content ::ng-deep blockquote {
      margin: 0.5rem 0;
      padding: 0.4rem 0.75rem;
      background: #f8fafc;
      border-left: 3px solid #6366f1;
      font-size: 0.785rem;
      color: #475569;
    }

    .action-buttons-wrap {
      margin-top: 0.75rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .copilot-action-btn {
      background: #ffffff;
      border: 1px solid #6366f1;
      color: #4f46e5;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-size: 0.785rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.15s;
    }
    .copilot-action-btn:hover {
      background: #4f46e5;
      color: #ffffff;
    }

    .followup-wrap {
      margin-top: 0.85rem;
      padding-top: 0.65rem;
      border-top: 1px dashed #cbd5e1;
    }
    .followup-title {
      font-size: 0.7rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      display: block;
      margin-bottom: 0.35rem;
    }
    .followup-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .followup-chip {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 0.25rem 0.55rem;
      border-radius: 9999px;
      font-size: 0.725rem;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s;
    }
    .followup-chip:hover {
      border-color: #6366f1;
      color: #4f46e5;
      background: #f5f3ff;
    }

    .thinking-bubble {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #64748b;
    }
    .thinking-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6366f1;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .thinking-dot:nth-child(1) { animation-delay: -0.32s; }
    .thinking-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }
    .thinking-text { font-size: 0.785rem; margin-left: 0.3rem; }

    .drawer-footer {
      padding: 0.875rem 1.25rem;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
    }
    .input-form {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      padding: 0.35rem 0.6rem;
    }
    .copilot-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 0.4rem 0.5rem;
      font-size: 0.875rem;
      outline: none;
      color: #1e293b;
    }
    .copilot-send-btn {
      background: #4f46e5;
      border: none;
      color: #fff;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: background 0.15s;
    }
    .copilot-send-btn:hover:not(:disabled) { background: #4338ca; }
    .copilot-send-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
  `]
})
export class AiCopilotComponent {
  isOpen = false;
  userInput = '';
  isLoading = false;

  quickPrompts: string[] = [
    '🛡️ Scan Shrinkage & Anomaly Radar [Phase 3]',
    '🤝 Supplier Risk Scorecards & Policies [Phase 3]',
    '📈 AI Restock Recommendations [Phase 2]',
    '🚨 Critical stockout risks (< 3 days)',
    '💵 Overstock & tied-up capital [Phase 2]',
    '✨ Catalog deduplication audit [Phase 2]',
    '🏬 Inventory value by warehouse'
  ];

  messages: ChatMessage[] = [
    {
      sender: 'ai',
      text: "👋 Hi! I am your **Enterprise Inventory Copilot** (Phase 1, 2 & 3 Autonomous AI). You can ask me natural language queries about **shrinkage & anomaly detection**, **supplier reliability scorecards & autonomous replenishment**, **predictive demand forecasting**, **dynamic restock runway**, and **catalog deduplication**.",
      response: {
        answerMarkdown: '',
        intent: 'Welcome',
        suggestedActions: [
          { label: 'Shrinkage & Anomaly Radar', route: '/audit', queryParams: { tab: 'anomalies' }, icon: '🛡️' },
          { label: 'Supplier Reliability Radar', route: '/suppliers', queryParams: { view: 'ai-scorecard' }, icon: '🤝' },
          { label: 'AI Demand Forecast', route: '/inventory', queryParams: { tab: 'forecast' }, icon: '🤖' },
          { label: 'Catalog Deduplication', route: '/products', queryParams: { action: 'audit' }, icon: '✨' }
        ],
        followUpQuestions: [
          'Scan for shrinkage & off-hours inventory anomalies',
          'Show supplier reliability scorecards & risk ratings',
          'Show AI restock recommendations',
          'How much capital is tied up in overstock?'
        ]
      },
      timestamp: new Date()
    }
  ];

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;

  constructor(
    private api: InventoryApiService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  toggleOpen() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.scrollToBottom(100);
    }
  }

  sendPrompt(promptText: string) {
    this.userInput = promptText.replace(/^[^\w]+/, '').trim();
    this.submitQuery();
  }

  submitQuery() {
    const q = this.userInput.trim();
    if (!q || this.isLoading) return;

    this.messages.push({
      sender: 'user',
      text: q,
      timestamp: new Date()
    });

    this.userInput = '';
    this.isLoading = true;
    this.cdr.markForCheck();
    this.scrollToBottom();

    this.api.queryCopilot(q, this.router.url).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.messages.push({
          sender: 'ai',
          text: res.answerMarkdown,
          response: res,
          timestamp: new Date()
        });
        this.cdr.markForCheck();
        this.scrollToBottom();
      },
      error: () => {
        this.isLoading = false;
        this.messages.push({
          sender: 'ai',
          text: "I encountered an error querying the system data. Please verify your connection to the API.",
          timestamp: new Date()
        });
        this.cdr.markForCheck();
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom(delay = 50): void {
    setTimeout(() => {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    }, delay);
  }

  handleAction(action: CopilotAction) {
    this.isOpen = false;
    this.router.navigate([action.route], { queryParams: action.queryParams });
  }

  formatContent(text: string): string {
    if (!text) return '';

    // Normalize line endings
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Convert basic markdown tables, bold, code, blockquotes to HTML
    let formatted = normalized
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Parse markdown tables
    if (formatted.includes('|')) {
      const lines = formatted.split('\n');
      let inTable = false;
      let tableHtml = '<div class="table-scroll-wrapper"><table>';
      const outputLines: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
          if (!inTable) {
            inTable = true;
            tableHtml = '<div class="table-scroll-wrapper"><table>';
            // header row
            const cells = line.split('|').slice(1, -1).map(c => `<th>${c.trim()}</th>`).join('');
            tableHtml += `<thead><tr>${cells}</tr></thead><tbody>`;
          } else if (line.includes('---')) {
            // separator row, ignore
          } else {
            // data row
            const cells = line.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('');
            tableHtml += `<tr>${cells}</tr>`;
          }
        } else {
          if (inTable) {
            inTable = false;
            tableHtml += '</tbody></table></div>';
            outputLines.push(tableHtml);
          }
          outputLines.push(line);
        }
      }
      if (inTable) {
        tableHtml += '</tbody></table></div>';
        outputLines.push(tableHtml);
      }
      formatted = outputLines.join('<br>');
    } else {
      formatted = formatted.replace(/\n/g, '<br>');
    }

    return formatted;
  }
}
