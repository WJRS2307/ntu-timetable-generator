import subprocess
import sys

def run_script(script_name):
    print(f"\n{'='*50}")
    print(f"Running {script_name}...")
    print(f"{'='*50}")
    
    try:
        # sys.executable ensures we use the same Python interpreter
        result = subprocess.run([sys.executable, script_name], check=True)
        if result.returncode == 0:
            print(f"\n[SUCCESS] {script_name} completed successfully.")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] {script_name} failed with exit code {e.returncode}.")
        return False

def main():
    scripts = [
        "ntu_scraper.py",
        "exam_scraper.py",
        "merge_exams.py"
    ]
    
    for script in scripts:
        success = run_script(script)
        if not success:
            print("\nPipeline stopped due to an error.")
            sys.exit(1)
            
    print("\nAll scripts executed successfully! The timetable and exam data is ready.")

if __name__ == "__main__":
    main()
