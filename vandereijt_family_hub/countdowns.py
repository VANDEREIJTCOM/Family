"""Configurable countdown content; household photos and facts stay in settings."""
import datetime as dt
import re


def date(value):
    try:
        text = str(value)
        return text if dt.date.fromisoformat(text).isoformat() == text else ''
    except (ValueError, TypeError):
        return ''


def image(value):
    text = str(value or '')[:1000]
    return text if (text.startswith('/') and not text.startswith('//')) or text.startswith('https://') else ''


def normalize(value):
    if not isinstance(value, dict):
        return None
    start, target, end = (date(value.get(key)) for key in ('start', 'target', 'end'))
    if not start or not target or not end or not start <= target <= end:
        return None
    if (dt.date.fromisoformat(end)-dt.date.fromisoformat(start)).days > 120:
        return None
    out = {key: str(value.get(key) or '')[:240] for key in ('heading', 'countdown_text', 'departure_text', 'started_text')}
    out.update(start=start, target=target, end=end, hero_image=image(value.get('hero_image')))
    days = []
    seen = set()
    for row in (value.get('days') if isinstance(value.get('days'), list) else [])[:121]:
        if not isinstance(row, dict):
            continue
        day = date(row.get('date'))
        if not day or not start <= day <= end or day in seen:
            continue
        seen.add(day)
        item = {'date': day, 'image': image(row.get('image'))}
        for key in ('title', 'text', 'question', 'answer', 'label', 'kind'):
            item[key] = str(row.get(key) or '')[:(800 if key == 'text' else 240)]
        icon = str(row.get('icon') or 'mdi:star')
        item['icon'] = icon if re.fullmatch(r'mdi:[a-z0-9-]{1,80}', icon) else 'mdi:star'
        crop = row.get('image_crop')
        if isinstance(crop, dict) and all(type(crop.get(key)) in (int, float) and 0 <= crop[key] <= 20000 for key in ('x', 'y', 'width', 'height', 'image_width', 'image_height')) and crop['width'] > 0 and crop['height'] > 0 and crop['x'] + crop['width'] <= crop['image_width'] and crop['y'] + crop['height'] <= crop['image_height']:
            item['image_crop'] = crop
        days.append(item)
    out['days'] = sorted(days, key=lambda row: row['date'])
    out['milestones'] = [dict(date=date(row.get('date')), title=str(row.get('title') or '')[:120], text=str(row.get('text') or '')[:240], image=image(row.get('image'))) for row in (value.get('milestones') if isinstance(value.get('milestones'), list) else [])[:6] if isinstance(row, dict) and date(row.get('date'))]
    return out
