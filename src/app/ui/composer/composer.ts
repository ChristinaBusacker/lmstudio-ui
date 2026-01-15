import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  Inject,
  Input,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Icon } from '../icon/icon';
import { Store } from '@ngxs/store';
import { ChatRequestMessage } from '@app/core/models/chat.models';
import { SendChatStream, AbortChatStream } from '@app/core/state/chat/chat.actions';
import { ChatState } from '@app/core/state/chat/chat.state';
import { LoadMessages } from '@app/core/state/messages/messages.actions';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-composer',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, Icon],
  templateUrl: './composer.html',
  styleUrl: './composer.scss',
})
export class Composer implements AfterViewInit {
  @Input() placeholder = 'Schreibe etwas...';
  @Input() forceTextarea = false;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {}

  store = inject(Store);

  @ViewChild('editable', { static: false })
  private editableRef?: ElementRef<HTMLDivElement>;

  isStreaming$: Observable<boolean> = this.store.select(ChatState.isStreaming);
  disabled = false;
  value = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  get useContentEditable(): boolean {
    if (this.forceTextarea) return false;
    return isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    // Wenn ViewChild erst nachträglich kommt: einmal initial syncen
    queueMicrotask(() => this.syncViewFromValue());
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

    // innerText liefert bei "leer" manchmal "\n" → normalize
    const next = (el.innerText ?? '').replace(/\r\n/g, '\n').replace(/^\n$/, '');
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

  // ---- Enter Handling ----
  onComposerKeydown(event: KeyboardEvent): void {
    if (this.disabled) return;

    // IME / composition: niemals auf Enter senden
    if ((event as any).isComposing) return;

    if (event.key !== 'Enter') return;

    // Mobile: Enter = Zeilenumbruch (nie senden)
    if (this.isMobileLike()) return;

    // Desktop: Shift+Enter = Umbruch
    if (event.shiftKey) return;

    // Desktop: Enter = senden
    event.preventDefault();
    this.send();
  }

  private isMobileLike(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;

    // Robust: coarse pointer oder Touchpoints
    const w = window as any;
    const coarse =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;

    const touch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0;
    return coarse || touch;
  }

  // ---- helpers ----
  private setValueFromUser(next: string): void {
    if (next === this.value) return;
    this.value = next;
    this.onChange(this.value);
  }

  private clearEditorAndRefocus(): void {
    this.value = '';
    this.onChange('');

    // contenteditable DOM wirklich leeren (sonst bleibt gern <br> / "\n")
    const el = this.editableRef?.nativeElement;
    if (this.useContentEditable && el) {
      el.replaceChildren(); // <- der zuverlässige Teil
      // Optional: falls du wirklich GAR nix drin willst:
      // el.textContent = '';
      queueMicrotask(() => el.focus());
    }
  }

  private syncViewFromValue(): void {
    if (!this.useContentEditable) return;
    const el = this.editableRef?.nativeElement;
    if (!el) return;

    // Wenn value leer ist: hart leeren, damit :empty greift
    if (!this.value) {
      el.replaceChildren();
      return;
    }

    const current = (el.innerText ?? '').replace(/\r\n/g, '\n').replace(/^\n$/, '');
    if (current === this.value) return;

    el.innerText = this.value;
  }

  // ---- actions ----
  send(): void {
    const trimmed = this.value.trim();
    if (!trimmed) return;

    const conversationId = this.store.selectSnapshot(
      (s) => s.conversations?.selectedConversationId
    );

    console.log(conversationId);

    const messages: ChatRequestMessage[] = [{ role: 'user', content: trimmed }];

    // Wichtig: clear + DOM wirklich leeren
    this.clearEditorAndRefocus();

    this.store.dispatch(
      new SendChatStream({
        conversationId,
        messages,
        temperature: 0.7,
      })
    );
  }

  abort(): void {
    this.store.dispatch(new AbortChatStream());
  }

  reload(): void {
    const conversationId =
      this.store.selectSnapshot(ChatState.conversationId) ??
      this.store.selectSnapshot((s) => s.conversations?.selectedConversationId);
    this.store.dispatch(new LoadMessages(conversationId));
  }
}
