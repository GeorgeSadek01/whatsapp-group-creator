# userinput.py
user_input = input("prompt: ")
print(f"User input received: {user_input}")

if user_input.lower() == "stop":
    print("Exiting...")
    exit()