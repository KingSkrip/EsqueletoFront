import { ScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { TextFieldModule } from '@angular/cdk/text-field';
import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    HostBinding,
    HostListener,
    Inject,
    NgZone,
    OnDestroy,
    OnInit,
    Renderer2,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subject, takeUntil } from 'rxjs';
import { Chat } from './quick-chat.types';
import { QuickChatService } from './quick-chat.service';

@Component({
    selector: 'quick-chat',
    templateUrl: './quick-chat.component.html',
    styleUrls: ['./quick-chat.component.scss'],
    encapsulation: ViewEncapsulation.None,
    exportAs: 'quickChat',
    imports: [
        MatIconModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        TextFieldModule,
    ],
})
export class QuickChatComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('messageInput') messageInput?: ElementRef<HTMLTextAreaElement>;

    chat: Chat | null = null;
    chats: Chat[] = [];
    opened = false;
    selectedChat: Chat | null = null;

    private _mutationObserver: MutationObserver | null = null;
    private _scrollStrategy: ScrollStrategy;
    private _overlay: HTMLElement | null = null;
    private _unsubscribeAll = new Subject<void>();

    constructor(
        @Inject(DOCUMENT) private _document: Document,
        private _elementRef: ElementRef<HTMLElement>,
        private _renderer2: Renderer2,
        private _ngZone: NgZone,
        private _quickChatService: QuickChatService,
        private _scrollStrategyOptions: ScrollStrategyOptions,
    ) {
        // Se inicializa aquí porque depende de un parámetro del constructor (TS2729)
        this._scrollStrategy = this._scrollStrategyOptions.block();
    }

    // -------------------------------------------------------------------
    // Decorated methods
    // -------------------------------------------------------------------

    @HostBinding('class') get classList(): Record<string, boolean> {
        return {
            'quick-chat-opened': this.opened,
        };
    }

    /** Resize on 'input' and 'ngModelChange' events (público: lo usa el decorador, TS2341) */
    @HostListener('input')
    @HostListener('ngModelChange')
    resizeMessageInput(): void {
        this._ngZone.runOutsideAngular(() => {
            setTimeout(() => {
                const el = this.messageInput?.nativeElement;
                if (!el) return;

                // 'auto' para leer correctamente el scrollHeight
                el.style.height = 'auto';
                el.style.height = `${el.scrollHeight}px`;
            });
        });
    }

    // -------------------------------------------------------------------
    // Lifecycle hooks
    // -------------------------------------------------------------------

    ngOnInit(): void {
        this._quickChatService.chat$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((chat) => {
                this.chat = chat;
                this.selectedChat = chat;
            });

        this._quickChatService.chats$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((chats) => {
                this.chats = chats ?? [];
            });
    }

    ngAfterViewInit(): void {
        // Fix para Firefox: 'position: sticky' falla dentro de un padre 'position: fixed'
        // cuando se agrega '.cdk-global-scrollblock' al <html>. Se lee el 'top' del html
        // y se aplica como 'margin-top' al panel.
        this._mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName !== 'class') return;

                const target = mutation.target as HTMLElement;

                if (target.classList.contains('cdk-global-scrollblock')) {
                    const top = parseInt(target.style.top, 10) || 0;
                    this._renderer2.setStyle(
                        this._elementRef.nativeElement,
                        'margin-top',
                        `${Math.abs(top)}px`,
                    );
                } else {
                    this._renderer2.removeStyle(
                        this._elementRef.nativeElement,
                        'margin-top',
                    );
                }
            });
        });

        this._mutationObserver.observe(this._document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    ngOnDestroy(): void {
        this._mutationObserver?.disconnect();

        // Evita dejar el overlay y el bloqueo de scroll si se destruye abierto
        this._hideOverlay();

        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
    }

    // -------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------

    open(): void {
        if (this.opened) return;
        this._toggleOpened(true);
    }

    close(): void {
        if (!this.opened) return;
        this._toggleOpened(false);
    }

    toggle(): void {
        this.opened ? this.close() : this.open();
    }

    selectChat(id: string): void {
        this._toggleOpened(true);
        this._quickChatService.getChatById(id).subscribe();
    }

    trackByFn(index: number, item: { id?: string | number }): string | number {
        return item.id || index;
    }

    // -------------------------------------------------------------------
    // Private methods
    // -------------------------------------------------------------------

    private _showOverlay(): void {
        // Cierra cualquier overlay previo
        this._hideOverlay();

        const overlay: HTMLElement = this._renderer2.createElement('div');
        overlay.classList.add('quick-chat-overlay');

        this._renderer2.appendChild(
            this._elementRef.nativeElement.parentElement,
            overlay,
        );

        this._overlay = overlay;
        this._scrollStrategy.enable();

        overlay.addEventListener('click', () => this.close());
    }

    private _hideOverlay(): void {
        const overlay = this._overlay;
        if (!overlay) return;

        overlay.remove();
        this._overlay = null;

        this._scrollStrategy.disable();
    }

    private _toggleOpened(open: boolean): void {
        this.opened = open;

        if (open) {
            this._showOverlay();
        } else {
            this._hideOverlay();
        }
    }
}