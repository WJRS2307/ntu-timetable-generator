import requests
from bs4 import BeautifulSoup
import json
import time
import os
import re

# URLs
MAIN_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/aus_schedule.main"
POST_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/AUS_SCHEDULE.main_display1"

# Set LIMIT for testing to avoid spamming the NTU server
# Set to None if you want to scrape all 693 subjects!
LIMIT = None

def get_options():
    print("Fetching main page to get academic parameters...")
    response = requests.get(MAIN_URL)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    acadsem_select = soup.find('select', {'name': 'acadsem'})
    if not acadsem_select:
        raise Exception("Could not find acadsem dropdown on main page.")
    
    acadsem_value = acadsem_select.find('option')['value']
    print(f"Using Academic Year/Semester: {acadsem_value}")
    
    subject_select = soup.find('select', {'name': 'r_course_yr'})
    
    subjects = []
    if subject_select:
        for option in subject_select.find_all('option'):
            val = option.get('value', '').strip()
            if val and not val.startswith('---'):
                subjects.append({
                    'code': val,
                    'name': option.get_text(strip=True)
                })
                
    return acadsem_value, subjects

def parse_html(html_content, school_name):
    """Parses the NTU messy HTML and returns a structured list of course dictionaries."""
    soup = BeautifulSoup(html_content, 'html.parser')
    tables = soup.find_all('table')
    
    parsed_courses = []
    current_course = None
    
    for table in tables:
        # NTU uses tables WITHOUT borders for course titles, and WITH borders for classes
        if not table.has_attr('border'):
            first_row = table.find('tr')
            if first_row:
                tds = first_row.find_all('td')
                if len(tds) >= 3:
                    course_code = tds[0].get_text(strip=True)
                    title = tds[1].get_text(strip=True)
                    au = tds[2].get_text(strip=True)
                    
                    current_course = {
                        'course_code': course_code,
                        'title': title,
                        'academic_units': au,
                        'school_category': school_name,
                        'exam': None,
                        'indexes': []
                    }
                    parsed_courses.append(current_course)
        else:
            # This is a class schedule table with border
            if not current_course:
                continue
                
            rows = table.find_all('tr')[1:] # Skip the header row
            
            current_index_obj = None
            current_index_num = ""
            
            for row in rows:
                tds = row.find_all('td')
                if len(tds) < 7:
                    continue
                    
                idx = tds[0].get_text(strip=True)
                typ = tds[1].get_text(strip=True)
                grp = tds[2].get_text(strip=True)
                day = tds[3].get_text(strip=True)
                tim = tds[4].get_text(strip=True)
                ven = tds[5].get_text(strip=True)
                rmk = tds[6].get_text(strip=True)
                
                # If NTU leaves index blank, it means it belongs to the previous index
                if idx:
                    current_index_num = idx
                    current_index_obj = {
                        'index_number': current_index_num,
                        'lessons': []
                    }
                    current_course['indexes'].append(current_index_obj)
                
                if current_index_obj:
                    # Ignore completely empty rows
                    if typ or grp or day or tim or ven:
                        current_index_obj['lessons'].append({
                            'type': typ,
                            'group': grp,
                            'day': day,
                            'time': tim,
                            'venue': ven,
                            'remark': rmk
                        })
    return parsed_courses

def scrape_subject(acadsem, subject_code, subject_name):
    data = {
        'acadsem': acadsem,
        'boption': 'CLoad',
        'r_course_yr': subject_code,
        'staff_access': 'false'
    }
    
    time.sleep(1) # Be polite to NTU servers!
    print(f"Fetching from: {POST_URL}")
    print(f"Scraping data for: {subject_name} ({subject_code})")
    
    response = requests.post(POST_URL, data=data)
    return parse_html(response.text, subject_name)

def sanitize_filename(name):
    # Remove invalid Windows filename characters
    return re.sub(r'[<>:"/\\|?*]', '_', name).strip()

def main():
    try:
        acadsem, subjects = get_options()
        print(f"Found {len(subjects)} subjects on NTU's website.")
        
        if len(subjects) == 0:
            print("No subjects found.")
            return

        if LIMIT:
            subjects = subjects[:LIMIT]
            print(f"LIMIT set to {LIMIT}. Only scraping the first {LIMIT} subjects for testing.")

        data_dir = os.path.join("..", "frontend", "public", "data")
        os.makedirs(data_dir, exist_ok=True)
        
        subject_catalog = []
        
        for subject in subjects:
            courses_in_subject = scrape_subject(acadsem, subject['code'], subject['name'])
            print(f"  -> Extracted {len(courses_in_subject)} courses.")
            
            # Save individual JSON file
            clean_name = sanitize_filename(subject['name'])
            filename = f"{clean_name}.json"
            filepath = os.path.join(data_dir, filename)
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(courses_in_subject, f, indent=4)
                
            # Add to master catalog
            subject_catalog.append({
                'name': subject['name'],
                'file': filename
            })
            
        print(f"\\nFinished! Extracted {len(subject_catalog)} subjects.")
        
        # Save master catalog
        catalog_path = os.path.join(data_dir, "subjects.json")
        with open(catalog_path, "w", encoding="utf-8") as f:
            json.dump(subject_catalog, f, indent=4)
            
        print(f"Saved master catalog to {catalog_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
