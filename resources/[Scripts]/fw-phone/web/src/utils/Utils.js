// NUI Functions
import { get, writable } from "svelte/store";
import { SuccessModal } from "../apps/Phone/phone.stores";
import { DropdownData } from "../stores";
import { FetchNui } from "./FetchNui";
import { UseNuiEvent } from "./UseNuiEvent";

export const SendEvent = (Event, Data, Cb) => {
    if (!Cb) Cb = () => {};

    FetchNui("fw-phone", Event, Data || {}).then((ReturnData) => {
        Cb(true, ReturnData);
    }).catch((e) => {
        Cb(false, e);
    });
}

export const AsyncSendEvent = (Event, Data) => {
    return new Promise((Res) => {
        SendEvent(Event, Data, (Success, Result) => {
            Res([Success, Result])
        })
    })
}

export const OnEvent = (Event, Cb) => {
    UseNuiEvent(Event, Cb);
}

export const Debug = (Message) => {
    // Disabled for PROD.
    // console.log(`[PHONE-UI]: ${Message}`);
}

export const SetExitHandler = (Event, NuiEvent, IsActive, Data) => {
    // Event = NUI Event, so you can reset data or smth
    // NuiEvent = NUI Callback in LUA
    // IsActive = Function Callback if the UI is focused (or active)
    // Data = Data to be sent to the Event & NUIEvent

    window.addEventListener("keyup", (e) => {
        if (e.key != 'Escape') return;
        if (!IsActive()) return;

        SendEvent(NuiEvent, Data)
        window.dispatchEvent(
            new MessageEvent("message", {
                data: {
                    Action: Event,
                    Data: Data || {},
                },
            })
        );
    });
};

export const SetDropdown = (Show, Options, Positioning) => {
    if (!Positioning) Positioning = {};
    Positioning.Width = Positioning?.Width || 'max-content';

    DropdownData.set({
        Show: Show,
        Options: Options,
        Positioning: Positioning
    })
}

// JS Functions
export const IsEnvBrowser = () => !(window).invokeNative;
export const Delay = Sec => new Promise( Res => setTimeout(Res, Sec * 1000) );

export const AddSpaces = Value => {
    return Value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
};

export const FormatCurrency = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
});

export const CalculateTimeLeftExact = (Time) => {
    var NowTime = new Date();
    var ItemTime = new Date(Time);
    var DifferenceMS = (ItemTime - NowTime);
    var DifferenceHours = Math.floor((DifferenceMS % 86400000) / 3600000);
    var DifferenceMins = Math.round(((DifferenceMS % 86400000) % 3600000) / 60000);

    return {Hours: DifferenceHours, Minutes: DifferenceMins}
}

export const GetTimeLabel = (date, nowDate = Date.now(), rft = new Intl.RelativeTimeFormat('nl', { numeric: "auto" })) => {
    const SECOND = 1000;
    const MINUTE = 60 * SECOND;
    const HOUR = 60 * MINUTE;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;
    const YEAR = 365 * DAY;
    const intervals = [
        { ge: YEAR, divisor: YEAR, unit: 'year' },
        { ge: MONTH, divisor: MONTH, unit: 'month' },
        { ge: WEEK, divisor: WEEK, unit: 'week' },
        { ge: DAY, divisor: DAY, unit: 'day' },
        { ge: HOUR, divisor: HOUR, unit: 'hour' },
        { ge: MINUTE, divisor: MINUTE, unit: 'minute' },
        { ge: 30 * SECOND, divisor: SECOND, unit: 'seconds' },
        { ge: 0, divisor: 1, text: 'zojuist' },
    ];
    const now = typeof nowDate === 'object' ? nowDate.getTime() : new Date(nowDate).getTime();
    const diff = now - (typeof date === 'object' ? date : new Date(date)).getTime();
    const diffAbs = Math.abs(diff);
    for (const interval of intervals) {
        if (diffAbs >= interval.ge) {
            const x = Math.round(Math.abs(diff) / interval.divisor);
            const isFuture = diff < 0;
            return interval.unit ? rft.format(isFuture ? x : -x, interval.unit) : interval.text;
        };
    };
};

export const GetLongTimeLabel = (timestamp) => new Date(timestamp).toLocaleString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export const CopyToClipboard = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};

// Phone Functions
export const FormatPhone = (PhoneNumber) => {
    const Cleaned = ('' + PhoneNumber).replace(/\D/g, ''); // Remove any non-numberic characters.
    const Match = Cleaned.match(/^(\d{2})(\d{1,8})$/); // Create a format that matches the number.
    if (Match) return Match[1] + ' ' + Match[2]; // If it matches return the formatted version.
    return PhoneNumber; // In case if the match failed (ex. not 10 digits) return the unformatted number.
};

export const ExtractImageUrls = (Str) => {
    const Regex = /https?:\/\/[^\s]+\.(?:jpg|jpeg|gif|png)/gi;
    const Urls = Str.match(Regex);
    const ModifiedStr = Str.replace(Regex, "");
    return [Urls || [], ModifiedStr];
}

export const ShowSuccessModal = () => {
    SuccessModal.set(true)
    setTimeout(() => {
        SuccessModal.set(false);
    }, 2000);
};

export let Notifications = writable([]);

export const AddNotification = (Data) => {
    const NotifIndex = get(Notifications).findIndex(Val => Val.Id == Data.Id);
    if (NotifIndex > -1) return UpdateNotification(Data);
    
    Debug("[ADD]: " + Data.Id);

    Data.State = "in";

    let NewNotifications = [...get(Notifications), Data];
    Notifications.set(NewNotifications)
};

export const UpdateNotification = (Data) => {
    const NotifIndex = get(Notifications).findIndex(Val => Val.Id == Data.Id);
    if (NotifIndex == -1) return;

    Debug("[UPDATE]: " + Data.Id);

    let NewNotifications = get(Notifications);

    if (Data.RemoveTimer) {
        NewNotifications[NotifIndex].ShowTimer = false;
    };

    if (Data.RemoveCountdown) {
        NewNotifications[NotifIndex].ShowCountdown = false;
    };

    if (Data.Title) {
        NewNotifications[NotifIndex].Title = Data.Title;
    };

    if (Data.Text) {
        NewNotifications[NotifIndex].Text = Data.Text;
    };

    if (Data.RemoveActions) {
        NewNotifications[NotifIndex].HasAccept = false
        NewNotifications[NotifIndex].HasReject = false

        if (!Data.HideImmediately) {
            setTimeout(() => {
                RemoveNotification({...Data, Fade: true});
            }, 3500);
        }
    };

    Notifications.set(NewNotifications);

    if (Data.HideImmediately) RemoveNotification({...Data, Fade: true});;
};

export const RemoveNotification = (Data) => {
    const NotifIndex = get(Notifications).findIndex(Val => Val.Id == Data.Id);
    if (NotifIndex == -1) return;

    Debug("[REMOVE]: " + Data.Id);

    if (Data.Fade) {
        let NewNotifications = get(Notifications);
        NewNotifications[NotifIndex].State = "out";
        Notifications.set(NewNotifications);
    }

    setTimeout(() => {
        let FilteredNotifications = get(Notifications).filter(Val => Val.Id != Data.Id);
        Notifications.set(FilteredNotifications);
    }, Data.Fade ? 500 : 0);
};

export const GetContactsSelect = async () => {
    let Retval = [];

    let [Success, Result] = await AsyncSendEvent("Contacts/GetContacts", {})
    if (!Success) return [];

    for (let i = 0; i < Result.length; i++) {
        const Contact = Result[i];
        Retval.push({ Value: Contact.phone, Text: Contact.name, ValueIsReal: true });
    };

    return Retval;
}