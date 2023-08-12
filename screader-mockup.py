import tkinter
import tkinter.ttk as ttk
import logging

__version__ = (0,1,0)

running = True

logger = logging.getLogger()
logger.setLevel(logging.INFO)
consoleHandler = logging.StreamHandler()
consoleHandler.setLevel(logging.DEBUG)
consoleHandler.setFormatter(logging.Formatter(
    fmt="%(asctime)s.%(msecs)03d [%(levelname)8s] %(message)s",
    datefmt="%m/%d %H:%M:%S")
)
logger.addHandler(consoleHandler)

configWindow = tkinter.Tk()
chatWindow = tkinter.Tk()
configWindow.focus_force()

chatWindowShown = True
def toggleChatWindow ():
    global chatWindowShown
    if chatWindow.state() == 'normal':
        chatWindow.withdraw()
        chatWindowShown = False
    elif chatWindow.state() == 'withdrawn':
        chatWindow.deiconify()
        configWindow.focus_force()
        chatWindowShown = True
    logger.debug(chatWindow.state())

def showGeometries():
    logger.info("config Window " + configWindow.geometry())
    logger.info("chat Window   " + chatWindow.geometry())

def stopMainLoop():
    global logger
    global running
    logger.info("Shutdown")
    running = False


def addChatMessage(master:tkinter.Widget=None, amount:str="$0.00", username:str="Unknown User", content=None):
    global styleBorderedFrame
    frameMessage = ttk.Frame(master=master, height="2c")
    frameData = ttk.Frame(master=frameMessage, width="4c")
    labelUsername = ttk.Label(master=frameData, text=username, padding=4, wraplength="4c")
    labelAmount = ttk.Label(master=frameData, text=amount, padding=4)
    labelContent = ttk.Label(master=frameMessage, text=content, padding=4, wraplength="12c", borderwidth=1)

    labelUsername.pack()
    labelAmount.pack()
    frameData.pack(anchor=tkinter.W, expand=False, side=tkinter.LEFT)
    labelContent.pack(after=frameData, side=tkinter.RIGHT)

    frameMessage.pack(expand=False, anchor=tkinter.W)


configWindow.title(f"Superchat Reader v{__version__[0]}.{__version__[1]}")
configWindow.wm_grid(widthInc=400,heightInc=40)

##################
## Menu Bar Setup
menuMain = tkinter.Menu(master=configWindow)
configWindow.config(menu=menuMain)

menuFile = tkinter.Menu(master=menuMain, tearoff=0)
menuMain.add_cascade(label="File", menu=menuFile)
menuFile.add_command(label="Open...")
menuFile.add_command(label="Save...")
menuFile.add_command(label="Save with images...")
menuFile.add_separator()
menuFile.add_command(label="Print Geometries", command=showGeometries)
menuFile.add_command(label="Quit", command=stopMainLoop)


menuView = tkinter.Menu(master=menuMain, tearoff=0)
# This doesn't work correctly, it doesn't check/uncheck based on the variable OR the window state
menuView.add_checkbutton(label="Show Chat Messages", command=toggleChatWindow, variable=chatWindowShown)
menuMain.add_cascade(label="View", menu=menuView)

menuConnect = tkinter.Menu(master=menuMain, tearoff=0)
menuConnect.add_command(label="Add new account")
menuConnect.add_command(label="Import messages from video")
menuMain.add_cascade(label="Connect", menu=menuConnect)


##################
## Config Window Setup
def configureConfigWindow():
    frameAccounts = ttk.Frame(master=configWindow)
    frameAccounts.grid(column=0,row=0,rowspan=40)

    ttk.Label(master=frameAccounts, text="YT Account 1").pack()
    ttk.Label(master=frameAccounts, text="YT Account 2").pack()
    ttk.Label(master=frameAccounts, text="Stream Elements Account 1").pack()
    ttk.Label(master=frameAccounts, text="Stream Labs Account 1").pack()
    ttk.Button(master=frameAccounts, text="+ Add Account").pack()

    frameStreams = ttk.Frame(configWindow)
    frameStreams.grid(column=1,row=0)

    ttk.Label(master=frameStreams, text="Video 1").pack()
    ttk.Label(master=frameStreams, text="Video 2").pack()
    ttk.Label(master=frameStreams, text="Video 3 mbik1dnv5T8").pack()
    ttk.Button(master=frameStreams, text="Refresh Videos").pack()


##################
## Chat Window Setup
def configureChatWindow():
    chatWindow.wm_transient(configWindow)
    chatWindow.title("Messages")
    addChatMessage(master=chatWindow, content="Message 1")
    addChatMessage(master=chatWindow, content="Message 2")
    addChatMessage(master=chatWindow, username="Very long username like damn bro calm down its too long", content="Message 3")
    addChatMessage(master=chatWindow, username="Long Post", content="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor`n incididunt ut labore et dolore magna aliqua. Gravida dictum fusce ut placerat orci. Nunc consequat interdum varius sit amet. Placerat vestibulum lectus mauris ultrices eros in cursus. Viverra mauris in aliquam sem fringilla ut morbi tincidunt augue. Tempus quam pellentesque nec nam. Adipiscing vitae proin sagittis nisl rhoncus mattis rhoncus urna. Platea dictumst vestibulum rhoncus est. Sit amet risus nullam eget felis eget. Tortor id aliquet lectus proin nibh nisl condimentum id. Vitae elementum curabitur vitae nunc sed velit dignissim. Tristique senectus et netus et. Velit laoreet id donec ultrices tincidunt arcu non. Commodo quis imperdiet massa tincidunt nunc pulvinar sapien et. Diam sollicitudin tempor id eu nisl.")

def updateWindows():
    try:
        configWindow.update()
        chatWindow.update()
    except:
        logger.warning("Failed to update windows (this is normal while quitting the program)")

def setupCloseActions():
    configWindow.protocol("WM_DELETE_WINDOW", stopMainLoop)
    chatWindow.protocol("WM_DELETE_WINDOW", toggleChatWindow)

def main():
    updateWindows()
    chatWindow.geometry(f"600x400+{configWindow.winfo_x() + configWindow.winfo_width() + 20}+{configWindow.winfo_y()}")
    showGeometries()
    while running:
        updateWindows()

if __name__ == "__main__":
    logger.info("Starting main loop")
    configureConfigWindow()
    configureChatWindow()
    setupCloseActions()
    main()
    configWindow.quit()
