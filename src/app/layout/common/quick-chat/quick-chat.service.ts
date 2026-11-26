import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
    BehaviorSubject,
    map,
    Observable,
    of,
    switchMap,
    tap,
    throwError,
} from 'rxjs';
import { Chat } from './quick-chat.types';

@Injectable({ providedIn: 'root' })
export class QuickChatService {
    private _chat = new BehaviorSubject<Chat | null>(null);
    private _chats = new BehaviorSubject<Chat[] | null>(null);

    constructor(private _httpClient: HttpClient) {}

    // -------------------------------------------------------------------
    // Accessors
    // -------------------------------------------------------------------

    get chat$(): Observable<Chat | null> {
        return this._chat.asObservable();
    }

    get chats$(): Observable<Chat[] | null> {
        return this._chats.asObservable();
    }

    // -------------------------------------------------------------------
    // Public methods
    // -------------------------------------------------------------------

    getChats(): Observable<Chat[]> {
        return this._httpClient
            .get<Chat[]>('api/apps/chat/chats')
            .pipe(tap((response) => this._chats.next(response)));
    }

    getChatById(id: string): Observable<Chat> {
        return this._httpClient
            .get<Chat>('api/apps/chat/chat', { params: { id } })
            .pipe(
                tap((chat) => this._chat.next(chat)),
                switchMap((chat) =>
                    chat
                        ? of(chat)
                        : throwError(() => new Error(`Could not find chat with id of ${id}!`)),
                ),
            );
    }
}