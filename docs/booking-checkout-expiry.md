# Expirácia booking checkoutov

Pending booking checkout je platný 15 minút a jeho URL obsahuje konkrétne `bookingId`.
Po expirácii sa tento checkout už nedá použiť na vytvorenie nového hold-u.

Scheduler beží priamo v Supabase cez `pg_cron` a `pg_net`, rovnakým spôsobom ako
booking reminder notifikácie.

1. Do produkčných environment variables webu nastav `CRON_SECRET` na dlhú náhodnú hodnotu.
2. V Supabase Dashboard > Vault vytvor secrets:
   - `booking_checkout_expiry_cron_url`: `https://www.tap-it.sk/api/cron/expire-booking-checkouts`
   - `booking_checkout_expiry_cron_secret`: tá istá hodnota ako produkčný `CRON_SECRET`.
3. V Supabase SQL Editore spusť
   [booking_checkout_expiry_cron_setup.sql](../sql/booking_checkout_expiry_cron_setup.sql).

Job `expire-booking-checkouts-every-minute` potom každú minútu pošle autorizovaný `GET`
na webový endpoint.

Endpoint zruší expired bookingy aj ich zrušiteľné Stripe Payment Intenty (spracúva ich po 100,
aby neblokoval ďalšie požiadavky). Ochrana je zároveň vynútená pri otvorení checkoutu, pri
vytvorení payment intentu a v Stripe webhooku, takže správnosť rezervácie nezávisí iba od
scheduleru.

Ak lazy cleanup zruší booking medzi dvoma cron tickmi, jeho Stripe Payment Intent nezostane
zabudnutý: zrušený booking ostáva v retry fronte, kým Stripe nepotvrdí jeho cancel.
