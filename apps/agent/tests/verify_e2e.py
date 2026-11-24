import httpx
import json
import time

def run_e2e_check():
    client = httpx.Client(timeout=30.0)

    # 1. Read ReentrancyBank.sol
    with open('contracts-samples/ReentrancyBank.sol', 'r', encoding='utf-8') as f:
        code = f.read()

    # 2. Trigger POST /audit
    res = client.post('http://127.0.0.1:8000/audit', json={'source_code': code})
    print('POST /audit status:', res.status_code, res.json())
    assert res.status_code == 200
    job_id = res.json()['job_id']

    # 3. Wait for completion
    completed = False
    for _ in range(15):
        time.sleep(1)
        status_res = client.get(f'http://127.0.0.1:8000/audit/{job_id}')
        data = status_res.json()
        print('Job status:', data.get('status'))
        if data.get('status') == 'completed':
            completed = True
            findings = data.get('findings', [])
            print(f"Audit Completed with {len(findings)} findings:")
            for f in findings:
                print(f"  [{f['id']}] {f['title']} | Severity: {f['severity']} | Status: {f['status']}")
            reproduced = [f for f in findings if f['status'] == 'Reproduced']
            assert len(reproduced) >= 1
            print(f"Verified {len(reproduced)} Reproduced finding(s)!")
            break

    assert completed, "Audit job did not complete in time"

    # 4. Fetch Report
    report_res = client.get(f'http://127.0.0.1:8000/audit/{job_id}/report.md')
    print('Report Status:', report_res.status_code)
    assert report_res.status_code == 200
    report_text = report_res.text
    print('Report preview:\n' + report_text[:300])
    assert "Automated tooling, not a substitute for a manual audit." in report_text
    print("All E2E checks passed successfully!")

if __name__ == '__main__':
    run_e2e_check()
