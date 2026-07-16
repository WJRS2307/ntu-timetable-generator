import requests
from bs4 import BeautifulSoup
import json
import os
import datetime
import re

MAIN_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/exam_timetable_und.MainSubmit"
DETAIL_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/exam_timetable_und.Get_detail"

def get_target_ay_string():
    now = datetime.datetime.now()
    year = now.year
    month = now.month

    if month >= 8:
        sem = 1
        acad_yr_start = year
    elif month <= 5:
        sem = 2
        acad_yr_start = year - 1
    else:
        # Jun-Jul (summer), target upcoming Sem 1
        sem = 1
        acad_yr_start = year

    next_yr = str(acad_yr_start + 1)[-2:]
    return f"AY{acad_yr_start}-{next_yr} SEM {sem}"

def get_exam_params(target_ay_str):
    print(f"Fetching exam timetable parameters. Targeting: {target_ay_str}")
    data = {
        'p_opt': '1', # General Access
        'p_type': 'UE',
        'bOption': 'Next'
    }
    response = requests.post(MAIN_URL, data=data)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract the radio buttons for Academic Year
    radios = soup.find_all('input', {'type': 'radio', 'name': 'p_plan_no'})
    
    p_plan_no = None
    # Find the radio button whose next sibling text contains our target string
    for radio in radios:
        text = str(radio.next_sibling).strip()
        if target_ay_str in text:
            p_plan_no = radio['value']
            break
            
    # Fallback to the latest one if we can't find the exact match
    if not p_plan_no and radios:
        print(f"Could not find exact match for {target_ay_str}. Using the latest available.")
        p_plan_no = radios[-1]['value']
        target_ay_str = str(radios[-1].next_sibling).strip()
        
    if not p_plan_no:
        raise Exception("Could not find any academic year options.")
        
    print(f"Selected Academic Year Option: {target_ay_str} (Plan No: {p_plan_no})")
    
    # Now that we have p_plan_no, we need to POST to query_page to get the final hidden fields
    QUERY_URL = "https://wish.wis.ntu.edu.sg/webexe/owa/exam_timetable_und.query_page"
    query_data = {
        'p_plan_no': p_plan_no,
        'p_type': 'UE',
        'p1': '',
        'p2': '',
        'bOption': 'Next'
    }
    query_response = requests.post(QUERY_URL, data=query_data)
    query_soup = BeautifulSoup(query_response.text, 'html.parser')
    
    # Extract other hidden fields from the query_page
    hidden_inputs = {}
    for hidden in query_soup.find_all('input', {'type': 'hidden'}):
        hidden_inputs[hidden['name']] = hidden.get('value', '')
        
    hidden_inputs['p_plan_no'] = p_plan_no
    
    return hidden_inputs

def fetch_exam_data(params):
    print("Fetching exam timetable data...")
    # Add the empty parameters from the second page
    data = params.copy()
    data.update({
        'p_exam_dt': '',
        'p_start_time': '',
        'p_dept': '',
        'p_subj': '',
        'p_venue': '',
        'p_matric': '',
        'bOption': 'Next'
    })
    
    response = requests.post(DETAIL_URL, data=data)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    rows = soup.find_all('tr')
    exams = {}
    count = 0
    
    for row in rows:
        tds = row.find_all('td')
        if len(tds) >= 6:
            date = tds[0].get_text(strip=True)
            day = tds[1].get_text(strip=True)
            time_str = tds[2].get_text(strip=True)
            course_code = tds[3].get_text(strip=True)
            title = tds[4].get_text(strip=True)
            duration = tds[5].get_text(strip=True)
            
            # Check if it's a valid data row (Date should contain a year like 2026 or month name, and shouldn't be the header)
            if date and course_code and "Date" not in date:
                exams[course_code] = {
                    'date': date,
                    'day': day,
                    'time': time_str,
                    'duration': duration
                }
                count += 1
                
    print(f"Found {count} exam entries.")
    return exams

def main():
    try:
        target_ay = get_target_ay_string()
        params = get_exam_params(target_ay)
        exams = fetch_exam_data(params)
        
        print(f"Successfully extracted {len(exams)} exam schedules.")
        
        if len(exams) > 0:
            data_dir = os.path.join("..", "frontend", "public", "data")
            os.makedirs(data_dir, exist_ok=True)
            
            filepath = os.path.join(data_dir, "exams.json")
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(exams, f, indent=4)
                
            print(f"Saved exam data to {filepath}")
        else:
            print("No exam data found. Please check if the portal layout has changed.")
            
    except Exception as e:
        print(f"Error scraping exams: {e}")

if __name__ == "__main__":
    main()
