import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ChatMessage } from '@shared/api/chat';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'app-message-item',
  imports: [CommonModule, MarkdownComponent],
  templateUrl: './message-item.html',
  styleUrl: './message-item.scss',
})
export class MessageItem {
  @Input({ required: true }) message!: ChatMessage;
}
