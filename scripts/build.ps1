# build.ps1 — Генерира js/data.js от JSON файловете в data/
# Прилага автоматични правила за нормализация + ръчни overrides.
# Използване: .\scripts\build.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dataDir = Join-Path $root "data"
$outputFile = Join-Path (Join-Path $root "js") "data.js"

Write-Host "=== Build data.js ===" -ForegroundColor Cyan
Write-Host ""

# Read source JSON files
$schoolsFile = Join-Path $dataDir "schools.json"
$districtsFile = Join-Path $dataDir "districts.json"
$overridesFile = Join-Path $dataDir "overrides.json"

if (-not (Test-Path $schoolsFile)) {
    Write-Host "ГРЕШКА: $schoolsFile не съществува. Изпълни първо .\scripts\import.ps1" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path $districtsFile)) {
    Write-Host "ГРЕШКА: $districtsFile не съществува. Изпълни първо .\scripts\import.ps1" -ForegroundColor Red
    exit 1
}

$schoolsJson = Get-Content $schoolsFile -Raw -Encoding UTF8
$districtsJson = Get-Content $districtsFile -Raw -Encoding UTF8
$schoolsData = $schoolsJson | ConvertFrom-Json
$districtsData = $districtsJson | ConvertFrom-Json

Write-Host "  Училища (сурови): $($schoolsData.features.Count)" -ForegroundColor Gray
Write-Host "  Райони:           $($districtsData.features.Count)" -ForegroundColor Gray

# ══════════════════════════════════════════════════════════════════
# Речник: пълно наименование → съкращение
# Подредени от по-дълъг към по-кратък за правилно съвпадение
# ══════════════════════════════════════════════════════════════════
$typeAbbreviations = [ordered]@{
    # Национални специфични
    'национална природо-математическа гимназия'          = 'НПМГ'
    'национална търговско-банкова гимназия'              = 'НТБГ'
    'софийска гимназия по строителство, архитектура и геодезия' = 'СГСАГ'
    'софийска гимназия по хлебни и сладкарски технологии' = 'СГХСТ'
    'софийска математическа гимназия'                    = 'СМГ'
    'софийска професионална гимназия по туризъм'         = 'СПГТ'
    'национална професионална гимназия по полиграфия и фотография' = 'НПГПФ'
    'национална професионална гимназия по прецизна техниха и оптика' = 'НПГПТО'
    'национална професионална гимназия по прецизна техника и оптика' = 'НПГПТО'
    'национална гимназия за древни езици и култура'      = 'НГДЕК'
    'национално музикално училище'                       = 'НМУ'
    'национално училище за танцово изкуство'             = 'НУТИ'
    'национално училище за изящни изкуства'              = 'НУИИ'
    'национално средно училище'                          = 'НСУ'
    # ПГ по специализации
    'професионална гимназия по аудио-, видео- и телекомуникация' = 'ПГАВТ'
    'професионална гимназия по подемна, строителна и транспортна техника' = 'ПГПСТТ'
    'професионална гимназия по хранително-вкусови технологии' = 'ПГХВТ'
    'професионална гимназия по екология и биотехнологии' = 'ПГЕБ'
    'професионална гимназия по електротехника и автоматика' = 'ПГЕА'
    'професионална гимназия по информационни технологии и езици' = 'ПГИТЕ'
    'професионална гимназия по банково дело, търговия и финанси' = 'ПГБДТФ'
    'професионална гимназия по икономика, информатика и туризъм' = 'ПГИИТ'
    'професионална гимназия по транспорт и енергетика'   = 'ПГТЕ'
    'професионална гимназия по фризьорство и козметика'  = 'ПГФК'
    'професионална гимназия по текстил и моден дизайн'   = 'ПГТМД'
    'професионална гимназия по текстилни и кожени изделия' = 'ПГТКИ'
    'професионална гимназия по железопътен транспорт'    = 'ПГЖТ'
    'професионална гимназия по механоелектотехника'      = 'ПГМЕТ'
    'професионална гимназия по селско стопанство'        = 'ПГСС'
    'професионална гимназия по облекло'                  = 'ПГО'
    'професионална гимназия по електроника'              = 'ПГЕ'
    'професионална гимназия по телекомуникации'          = 'ПГТел'
    'професионална гимназия по транспорт'                = 'ПГТр'
    'професионална гимназия по охрана и сигурност'       = 'ПГОС'
    'професионална гимназия по туризъм'                  = 'ПГТур'
    'професионална гимназия'                             = 'ПГ'
    # Частни ПГ
    'частна професионална гимназиа по икономика, информатика и туризъм' = 'ЧПГИИТ'
    'частна професионална гимназия по банково дело, търговия и финанси' = 'ЧПГБДТФ'
    'частна професионална гимназия по охрана и сигурност' = 'ЧПГОС'
    'частна професионална гимназия'                      = 'ЧПГ'
    'частна профилирана гимназия по информационни технологии и езици' = 'ЧПрГИТЕ'
    'частна профилирана гимназия с преподаване на английски език' = 'ЧПрГАЕ'
    'частна профилирана гимназия'                        = 'ЧПрГ'
    'частна гимназия с езиков и хуманитарен профил'      = 'ЧГЕХП'
    'частна езикова гимназия'                            = 'ЧЕГ'
    # Профилирани
    'профилирана гимназия за изобразителни изкуства'     = 'ПрГИИ'
    'профилирана гимназия с интензивно изучаване на румънски език' = 'ПрГРЕ'
    'профилирана гимназия'                               = 'ПрГ'
    'профилирана езикова гимназия'                       = 'ПрЕГ'
    # Езикови
    'средно училище за чужди езици и мениджмънт'         = 'СУЧЕМ'
    'средно езиково училище'                             = 'СЕУ'
    'гимназия с преподаване на испански език'            = 'ГПИЕ'
    'гимназия с изучаване на чужд език'                  = 'ГИЧЕ'
    'немска езикова гимназия'                            = 'НЕГ'
    'френска езикова гимназия'                           = 'ФЕГ'
    'втора английска езикова гимназия'                   = 'II АЕГ'
    'първа английска езикова гимназия'                   = 'I АЕГ'
    'първа частна английска гимназия'                    = 'I ЧАГ'
    'първа частна математическа гимназия'                = 'I ЧМГ'
    'езикова гимназия'                                   = 'ЕГ'
    # Специализирани
    'специализирано спортно училище'                     = 'ССУ'
    'специално училище за ученици с нарушено зрение'     = 'СУУНЗ'
    'софийска духовна семинария'                         = 'СДС'
    'финансово-стопанска гимназия'                       = 'ФСГ'
    # Частни общообразователни
    'частно средно общообразователно училище'            = 'ЧСОУ'
    'частно средно езиково училище'                      = 'ЧСЕУ'
    'частно средно училище по изкуства и чужди езици'    = 'ЧСУ ИЧЕ'
    'частно средно училище'                              = 'ЧСУ'
    'частно езиково средно училище'                      = 'ЧЕСУ'
    'частно основно училище с изучаване на немски език'  = 'ЧОУНЕ'
    'частно основно училище с ранно чуждоезиково обучение' = 'ЧОУРЧО'
    'частно основно училище'                             = 'ЧОУ'
    'частно начално училище'                             = 'ЧНУ'
    'частно ОУ с изучаване на английски език'            = 'ЧОУАЕ'
    'частно ОУ'                                          = 'ЧОУ'
    # Помощни / ЦСОП
    'основно помощно училище'                            = 'ОПУ'
    # Основни типове (накрая — по-къси)
    'средно общообразователно училище'                   = 'СУ'
    'средно училище'                                     = 'СУ'
    'основно училище'                                    = 'ОУ'
    'начално училище'                                    = 'НУ'
    'сменно-вечерна гимназия'                            = 'СВГ'
    'вечерно СУ'                                         = 'ВСУ'
}

# ══════════════════════════════════════════════════════════════════
# Функции за нормализация
# ══════════════════════════════════════════════════════════════════

$script:lq = [char]0x201E  # opening „
$script:rq = [char]0x201C  # closing "

function Wrap-Patron($text) {
    return "${script:lq}${text}${script:rq}"
}

function To-TitleCase($text) {
    if (-not $text) { return $text }
    # Конвертира "ХРИСТО БОТЕВ" -> "Христо Ботев"
    $words = $text -split '\s+'
    $result = @()
    # Предлози и съюзи — остават с малка буква (освен ако са първа дума)
    $lowercase = @('по','и','в','на','за','с','от','към','до','при','без','през','под','над','между','чрез')
    # Познати съкращения, които да се запазват изцяло главни
    $knownAbbr = @('СУ','ОУ','НУ','ПГ','ЕГ','СОУ','НПМГ','НТБГ','СГСАГ','СПГЕ','ЦСОП',
                   'ДПН','НГ','ЧПГ','ЧНГ','ЧНУ','ЧОУ','ЧСУ','ЧСОУ','НСУ','ССУ',
                   'НФСГ','СГХСТ','ПГТ','ГИЧЕ','СВГ','II','I')
    foreach ($w in $words) {
        if ($w.Length -le 1) { $result += $w.ToUpper(); continue }
        $upper = $w.ToUpper()
        # Запазваме само познати съкращения
        if ($knownAbbr -contains $upper) { $result += $upper; continue }
        $lower = $w.ToLower()
        # Предлози — малка буква (но не ако е първата дума)
        if ($result.Count -gt 0 -and $lowercase -contains $lower) {
            $result += $lower
            continue
        }
        # Всичко останало: Title Case
        $result += $w.Substring(0,1).ToUpper() + $w.Substring(1).ToLower()
    }
    return ($result -join ' ')
}

function Clean-RawName($name) {
    if (-not $name) { return $name }
    # Премахване на излишни интервали
    $name = $name -replace '\s{2,}', ' '
    $name = $name.Trim()
    # Премахване на trailing ; и скоби с дублирани имена
    $name = $name -replace ';\s*$', ''
    # Премахване на всякакви кавички
    $name = $name -replace '[""„"»«\u00AB\u00BB\u201C\u201D\u201E\u201F]', ''
    # Уеднаквяване на тирета
    $name = $name -replace '\s*[–—]\s*', ' - '
    return $name.Trim()
}

function Build-ShortName($name) {
    if (-not $name) { return $name }

    $cleaned = Clean-RawName $name
    $lower = $cleaned.ToLower()

    # Опит за съвпадение с вече съкратени форми в оригинала (напр. "ПГТ", "СПГЕ", "НПМГ")
    # Ако името вече започва с известно съкращение, запази го
    $knownPrefixes = @('НПМГ','НТБГ','СГСАГ','СГХСТ','СПГЕ','НФСГ','НГ ','ПГТ ','ПГ ',
                       'ЧПГ ','ЧНГ','ЧНУ','ЧОУ','ЧСУ','ЧСОУ','ЧУТИ','ЧПСОУ','ГИЧЕ')
    foreach ($prefix in $knownPrefixes) {
        if ($cleaned.StartsWith($prefix)) {
            # Вече е съкратено — извлечи патрон
            $rest = $cleaned.Substring($prefix.TrimEnd().Length).Trim()
            $rest = $rest -replace '^,\s*', ''
            # Ако остатъкът е пълно наименование (напр. "ПРОФЕСИОНАЛНА ГИМНАЗИЯ..."), пропусни
            if ($rest -match '(?i)^(професионална|частна|гимназия|училище)') { break }
            if ($rest) {
                $patron = To-TitleCase $rest
                return "$($prefix.TrimEnd()) $(Wrap-Patron $patron)"
            }
            return $prefix.TrimEnd()
        }
    }

    # Търсене на номер в началото (напр. "21 СОУ ..." или "148 СОУ ...")
    $number = ''
    $nameForSearch = $lower
    if ($cleaned -match '^(\d+[\-]?(?:во|ма|то|ро)?)\s+(.+)$') {
        $number = $Matches[1]
        $nameForSearch = $Matches[2].ToLower()
        $cleaned = $Matches[2]
    }

    # СОУ → СУ в nameForSearch
    $nameForSearch = $nameForSearch -replace '\bсоу\b', 'су'
    $cleaned = $cleaned -replace '(?i)\bСОУ\b', 'СУ'

    # Търсене на тип в речника
    $abbr = $null
    $patron = ''
    foreach ($key in $typeAbbreviations.Keys) {
        if ($nameForSearch.StartsWith($key)) {
            $abbr = $typeAbbreviations[$key]
            $rest = $cleaned.Substring($key.Length).Trim()
            # Премахване на водещи предлози, ако са останали
            $rest = $rest -replace '^[,;]\s*', ''
            $patron = $rest
            break
        }
        # Пробвай и без "частна/частно" в началото
    }

    # Ако не е намерен тип по пълно име, опитай с кратките форми
    if (-not $abbr) {
        $shortTypes = @{
            'су ' = 'СУ'; 'оу ' = 'ОУ'; 'ну ' = 'НУ'
        }
        foreach ($st in $shortTypes.Keys) {
            if ($nameForSearch.StartsWith($st)) {
                $abbr = $shortTypes[$st]
                $patron = $cleaned.Substring($st.Length).Trim()
                break
            }
        }
    }

    # Ако намерихме съвпадение
    if ($abbr) {
        $prefix = if ($number) { "$number $abbr" } else { $abbr }
        if ($patron) {
            $patron = To-TitleCase $patron
            # Премахване на скоби с допълнителна инфо
            $patron = $patron -replace '\s*\(.*\)\s*$', ''
            $patron = $patron.Trim()
            if ($patron) { return "$prefix $(Wrap-Patron $patron)" }
        }
        return $prefix
    }

    # Ако не сме намерили тип — просто нормализираме регистъра
    $result = if ($number) { "$number " + (To-TitleCase $cleaned) } else { To-TitleCase $cleaned }
    return $result
}

function Build-FullName($name) {
    if (-not $name) { return $name }
    $cleaned = Clean-RawName $name

    # СОУ → СУ
    $cleaned = $cleaned -replace '(?i)\bСОУ\b', 'СУ'

    # Ако е ALL CAPS — конвертирай до смесен регистър
    if ($cleaned -cmatch '^[^a-zа-я]*$' -and $cleaned -cmatch '[А-Я]{3,}') {
        # Запази номер отпред
        $number = ''
        $rest = $cleaned
        if ($cleaned -match '^(\d+[\-]?(?:ВО|МА|ТО|РО|во|ма|то|ро)?)\s+(.+)$') {
            $number = $Matches[1] + ' '
            $rest = $Matches[2]
        }

        # Опитай се да намериш тип в речника — раздели на тип + патрон
        $lowerRest = $rest.ToLower()
        $typePart = $null
        $patronPart = $null
        foreach ($key in $typeAbbreviations.Keys) {
            if ($lowerRest.StartsWith($key)) {
                $typePart = $rest.Substring(0, $key.Length)
                $patronPart = $rest.Substring($key.Length).Trim()
                $patronPart = $patronPart -replace '^[,;]\s*', ''
                break
            }
        }

        if ($typePart) {
            # Тип: sentence case (първа главна, останалите малки)
            $typeSentence = $typePart.Substring(0,1).ToUpper() + $typePart.Substring(1).ToLower()
            if ($patronPart) {
                # Патрон: Title Case
                $patronTitle = To-TitleCase $patronPart
                $cleaned = $number + $typeSentence + ' ' + $patronTitle
            } else {
                $cleaned = $number + $typeSentence
            }
        } else {
            # Не може да се раздели — просто sentence case
            $cleaned = $number + $rest.Substring(0,1).ToUpper() + $rest.Substring(1).ToLower()
        }
    }

    # Премахване на trailing ; и скоби с дублиращи имена
    $cleaned = $cleaned -replace ';\s*$', ''
    $cleaned = $cleaned.Trim()

    return $cleaned
}

# ══════════════════════════════════════════════════════════════════
# Прилагане на нормализацията
# ══════════════════════════════════════════════════════════════════
$normalizedCount = 0
foreach ($feature in $schoolsData.features) {
    $original = $feature.properties.object_nam

    # Генериране на пълно нормализирано име
    $fullName = Build-FullName $original
    if ($fullName -ne $original) { $normalizedCount++ }
    $feature.properties.object_nam = $fullName

    # Генериране на кратко име
    $shortName = Build-ShortName $original
    $feature.properties | Add-Member -MemberType NoteProperty -Name 'short_name' -Value $shortName -Force
}
Write-Host "  Нормализирани имена: $normalizedCount" -ForegroundColor Yellow

# ── Ръчни overrides ──
if (Test-Path $overridesFile) {
    $overrides = Get-Content $overridesFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $appliedCount = 0

    foreach ($feature in $schoolsData.features) {
        $id = [string]$feature.properties.id
        if ($overrides.PSObject.Properties.Name -contains $id) {
            $override = $overrides.$id
            foreach ($prop in $override.PSObject.Properties) {
                if ($prop.Name -eq '_comment' -or $prop.Name -eq 'examples') { continue }
                $feature.properties | Add-Member -MemberType NoteProperty -Name $prop.Name -Value $prop.Value -Force
            }
            $appliedCount++
        }
    }
    Write-Host "  Приложени overrides: $appliedCount" -ForegroundColor Yellow
} else {
    Write-Host "  (няма overrides.json)" -ForegroundColor Gray
}

# ── Замяна на [текст] с „текст" във всички string полета ──
$lq = [char]0x201E
$rq = [char]0x201C
foreach ($feature in $schoolsData.features) {
    $p = $feature.properties
    if ($p.object_nam -match '\[') {
        $p.object_nam = $p.object_nam -replace '\[([^\]]+)\]', "${lq}`$1${rq}"
    }
    if ($p.short_name -and $p.short_name -match '\[') {
        $p.short_name = $p.short_name -replace '\[([^\]]+)\]', "${lq}`$1${rq}"
    }
}

# ── Генериране на data.js ──
$schoolsOut = $schoolsData | ConvertTo-Json -Depth 10 -Compress
$districtsOut = $districtsJson.Trim()

$content = "const DISTRICTS_DATA = " + $districtsOut + ";" + "`n`n" + "const SCHOOLS_DATA = " + $schoolsOut + ";" + "`n"
[System.IO.File]::WriteAllText($outputFile, $content, (New-Object System.Text.UTF8Encoding $true))

$outputSize = (Get-Item $outputFile).Length
Write-Host ""
Write-Host "Генериран: js/data.js ($([math]::Round($outputSize/1024)) KB)" -ForegroundColor Green
Write-Host "Готово!" -ForegroundColor Cyan
