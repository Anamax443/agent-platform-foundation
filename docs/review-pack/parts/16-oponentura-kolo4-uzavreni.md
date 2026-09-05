# ČÁST XVI — Protokol 4. kola a uzavření textové fáze

| | |
|---|---|
| **Předmět** | balíček v1.0-rc2.1 (errata) |
| **Posudky** | tři na rc2.1 (9,2 / 9,5 / 9,5) a jeden opakovaný text posudku z 3. kola na rc2 (9,4), jehož nálezy rc2.1 už řeší |
| **Výsledek** | 1 MINOR, 3 NOTE k přípravě implementace, 0 MAJOR, 0 BLOCKER; všechny tři posudky rc2.1: přijmout, zmrazit, stavět |
| **Rozhodnutí** | textová fáze uzavřena; `FOUNDATION-core.md`, `VERIFICATION-CONTRACT.md` a `contracts/*.schema.json` jsou **zmrazeny na rc2.1** pro první implementaci; změny jen s evidencí z kódu |

## 16.1 Posudky

| Posudek | Skóre | Verdikt | Obsah |
|---|---|---|---|
| 1 | 9,4 | (opakování 3. kola) | totožný text posudku 4 z 3. kola na rc2; pět nálezů (cena `PRINCIPAL`, deklarace validátorů, `MUT-HOST-001`, práh fronty, Ed25519 na Workers) je zapracováno v rc2.1, viz XV |
| 2 | 9,2 | přijmout jako 1.0 s implementačním ověřením | žádný nový normativní nález; checklist pro první implementaci; potvrzení, že všech sedm jeho nálezů z 3. kola je vyřešeno |
| 3 | 9,5 | přijmout jako 1.0 | ověřil schéma (`effectFields`, podmínka HIGH/CRITICAL, příklad), 0 nálezů proti normě, 3 NOTE k přípravě M1/M3 |
| 4 | 9,5 (architektura 9,7) | uzavřený návrh připravený k implementaci | 1 MINOR (ukázka v §4.3 jádra s HMAC), poznámka: nápovědu `validator` v descriptoru ponechat, policy vítězí, divergenci hlásit jako warning |

Rozptyl skóre 0,3 bodu. Dva posudky výslovně: skórování dokumentu tady končí, další body může získat jen kód.

## 16.2 Nálezy a rozhodnutí

| # | Nález | Kdo | Závažnost | Rozh. | Změna |
|---|---|---|---|---|---|
| 1 | Ukázka dispatch obálky v jádru §4.3 má `HMAC-SHA256`, zatímco default je Ed25519 | 4 | MINOR | **P** | opraveno na `Ed25519`; HMAC zůstává v textu jen jako povolená výjimka pro jeden deployable |
| 2 | `policyRef` odkazuje na artefakt bez formátu; první HIGH executor by policy psal ad-hoc | 3 | NOTE | **P** | ADR-016: policy = JSON per capability a verze, vzor `contracts/policy/payment.execute.v1.policy.example.json`; schéma napíše první consumer (M1) |
| 3 | `CredentialResolverFixture` deklarována, ne specifikována; první implementátor ji musí napsat jako první | 3 | NOTE | **P** | rozhraní a dva režimy (`strict` / `mutant`) ve VC §6; Workers a Node varianty pojmenovány |
| 4 | Pentest izolace je podmínka 1.0 bez scope | 3 | NOTE | **P** | ADR-017: runtime, výchozí pozice útočníka, cíle, vektory, mitigace, vyhodnocení a co znamená pro normu |
| 5 | Nápověda `effectFields[].validator` vedle autority v policy: nechat, policy vítězí, divergence jako warning | 4 | NOTE | **P** | zapsáno v ADR-016 |
| 6 | Posudek 1 je opakování 3. kola | 1 | — | **Z** | nálezy vyřešeny v rc2.1, viz XV #1, #3, #7, #9, #10 |

## 16.3 Uzavření textové fáze

Čtyři kola, čtyři posudky v každém, 80 nálezů celkem (31 + 21 + 14 + 6 + 8 potvrzení). Přijato nebo přijato s úpravou 71, odmítnuto s důvodem 5, vzato na vědomí 4. Skóre posledního kola 9,2 až 9,5 s rozptylem 0,3.

Zmrazeno pro první implementaci:

```text
FOUNDATION-core.md            1.0-rc2.1
VERIFICATION-CONTRACT.md      1.0-rc2.1
contracts/*.v1.schema.json    5 schémat, 32 negativních testů, EVD-006
contracts/policy/*.example    vzor policy (ADR-016)
```

Změna kteréhokoli zmrazeného artefaktu vyžaduje evidenci z kódu: nález z první implementace, změřený čas, výsledek pentestu. Nikoli další posudek na papíře.

## 16.4 Co se měří v první implementaci

Podle shody posudků 2 až 4 jediná metrika, která rozhodne o hodnotě normy:

> Kolik práce navíc norma vytvořila, a kolikrát test zachránil chybu dřív, než by ji našel provoz.

Zapisuje se do HANDOFF první komponenty po každém milníku XII.G: hodiny na descriptor, kontrakt, testy, boilerplate; co bylo nutné obejít; která abstrakce byla zbytečná; která chyběla; každý zachycený nález s Test ID. Limit 40 hodin na MUST sadu platí. První kostka: `document.classify` → `document.validate` → `document.stamp`. Druhá: `mail.received` → `email.send`. Pak `INT-REPLACE-001` na jedné z nich: výměna implementace bez zásahu do druhé je první skutečný důkaz LEGO principu.

Další verze tohoto balíčku bude mít část XVII s názvem „Protokol implementace", ne „Protokol oponentury".
