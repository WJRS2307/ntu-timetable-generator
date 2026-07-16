import json
import os
import glob

def main():
    data_dir = os.path.join("..", "frontend", "public", "data")
    exams_path = os.path.join(data_dir, "exams.json")
    
    if not os.path.exists(exams_path):
        print("exams.json not found! Please run exam_scraper.py first.")
        return
        
    with open(exams_path, "r", encoding="utf-8") as f:
        exams = json.load(f)
        
    print(f"Loaded {len(exams)} exam records.")
    
    # Iterate through all JSON files in the data directory
    json_files = glob.glob(os.path.join(data_dir, "*.json"))
    
    updated_count = 0
    total_courses = 0
    
    for file_path in json_files:
        filename = os.path.basename(file_path)
        
        # Skip exams.json and subjects.json
        if filename in ["exams.json", "subjects.json"]:
            continue
            
        with open(file_path, "r", encoding="utf-8") as f:
            try:
                courses = json.load(f)
            except json.JSONDecodeError:
                print(f"Warning: Could not parse {filename}. Skipping.")
                continue
                
        if not isinstance(courses, list):
            continue
            
        file_updated = False
        for course in courses:
            total_courses += 1
            course_code = course.get("course_code")
            
            if course_code in exams:
                course["exam"] = exams[course_code]
                file_updated = True
                updated_count += 1
            else:
                # Ensure it has an exam key even if null
                if "exam" not in course or course["exam"] is not None:
                    course["exam"] = None
                    file_updated = True
                    
        # Save back only if there were modifications
        if file_updated:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(courses, f, indent=4)
                
    print(f"Finished processing. Updated {updated_count} out of {total_courses} courses with exam dates.")

if __name__ == "__main__":
    main()
