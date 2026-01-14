import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
  inject,
  Input,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';
import { Store } from '@ngxs/store';
import { ChatRequestMessage } from '@app/core/models/chat.models';
import { SendChatStream, AbortChatStream } from '@app/core/state/chat/chat.actions';
import { ChatState } from '@app/core/state/chat/chat.state';
import { LoadMessages } from '@app/core/state/messages/messages.actions';
import { UUID } from 'crypto';
import { Observable } from 'rxjs/internal/Observable';

@Component({
  selector: 'app-composer',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Icon],
  templateUrl: './composer.html',
  styleUrl: './composer.scss',
})
export class Composer {
  @Input() placeholder = 'Schreibe etwas...';
  @Input() forceTextarea = false;

  store = inject(Store);

  @ViewChild('editable', { static: false })
  private editableRef?: ElementRef<HTMLDivElement>;

  isStreaming$: Observable<boolean> = this.store.select(ChatState.isStreaming);
  disabled = false;
  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  get useContentEditable(): boolean {
    if (this.forceTextarea) return false;
    return isPlatformBrowser(this.platformId);
  }

  // ---- ControlValueAccessor ----
  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.syncViewFromValue();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.syncViewFromValue();
  }

  // ---- DOM -> Model ----

  onEditableInput(): void {
    if (this.disabled) return;

    const el = this.editableRef?.nativeElement;
    if (!el) return;

    // Plain text extraction; keeps line breaks reasonably.
    const next = (el.innerText ?? '').replace(/\r\n/g, '\n');
    this.setValueFromUser(next);
  }

  onTextareaInput(event: Event): void {
    if (this.disabled) return;

    const target = event.target as HTMLTextAreaElement | null;
    const next = (target?.value ?? '').replace(/\r\n/g, '\n');
    this.setValueFromUser(next);
  }

  markTouched(): void {
    this.onTouched();
  }

  // ---- helpers ----

  private setValueFromUser(next: string): void {
    if (next === this.value) return;
    this.value = next;
    this.onChange(this.value);
  }

  private syncViewFromValue(): void {
    // Only relevant for contenteditable mode
    if (!this.useContentEditable) return;

    const el = this.editableRef?.nativeElement;
    if (!el) return;

    // Avoid stomping the caret while typing if the DOM already matches.
    const current = (el.innerText ?? '').replace(/\r\n/g, '\n');
    if (current === this.value) return;

    // Write plain text safely.
    el.innerText = this.value;
  }

  send() {
    const trimmed = this.value.trim();
    if (!trimmed) return;

    const conversationId =
      this.store.selectSnapshot(ChatState.conversationId) ??
      this.store.selectSnapshot((s) => s.conversations?.selectedConversationId);

    const messages: ChatRequestMessage[] = [{ role: 'user', content: trimmed }];

    this.store.dispatch(
      new SendChatStream({
        conversationId: conversationId,
        messages,
        temperature: 0.7,
      })
    );

    this.setValueFromUser('');
  }

  abort() {
    this.store.dispatch(new AbortChatStream());
  }

  reload() {
    const conversationId =
      this.store.selectSnapshot(ChatState.conversationId) ??
      this.store.selectSnapshot((s) => s.conversations?.selectedConversationId);
    this.store.dispatch(new LoadMessages(conversationId));
  }
}
