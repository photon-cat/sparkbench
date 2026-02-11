// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;
using ChipLibrary;
using System.Diagnostics;

namespace Schematics
{
    /// <summary>
    /// Definition of a specific progress event argument class.
    /// </summary>
    public class ProgressEventArgs : EventArgs
    {
        /// <summary>Current progress position for a progress bar.</summary>
        public readonly int CurrentPosition;
        /// <summary>Current mximum position for a progress bar.</summary>
        public readonly int MaxPosition;
        /// <summary>A specific text for the progress activity.</summary>
        public readonly string ActivityText;
        /// <summary>The current simulation time in ns.</summary>
        public readonly double CurrentSimTime;

        /// <summary>
        /// Creates an instance of this class.
        /// </summary>
        /// <param name="CurrentPosition">Current progress position for a progress bar.</param>
        /// <param name="MaxPosition">Current mximum position for a progress bar.</param>
        /// <param name="ActivityText">A specific text for the progress activity.</param>
        /// <param name="CurrentSimTime">The current simulation time in ns.</param>
        public ProgressEventArgs(int CurrentPosition, int MaxPosition, string ActivityText, double CurrentSimTime)
        {
            this.CurrentPosition = CurrentPosition;
            this.MaxPosition = MaxPosition;
            this.ActivityText = ActivityText;
            this.CurrentSimTime = CurrentSimTime;
        }
    }

    /// <summary>
    /// Definition of the delegate for the progress event handler.
    /// </summary>
    /// <param name="sender">Reference to the sender object.</param>
    /// <param name="e">Event argument passed with the call.</param>
    public delegate void ProgressEventHandler(object sender, ProgressEventArgs e);

    /// <summary>
    /// Enumeration to identify the source of the schematics
    /// </summary>
    public enum SchematicsSource
    {
        None,
        TestSchematics,
        BenEater8Bit,
        GigatronTTL,
        NetlistImport,
        SimTTLFile
    }


    /// <summary>
    /// Definition of a base class for a schematics.
    /// </summary>
    public class BaseSchematics
    {
        /// <summary>Current time value to be used for the simulation in ns.</summary>
        private double time;
        /// <summary>Run time of the simulation in seconds.</summary>
        private double simRunTime;
        /// <summary>A local counter for net identifiers.</summary>
        private int netID;
        /// <summary>Time interval in ns.</summary>
        private double timeInterval;
        /// <summary>Maximum simulation time in ns.</summary>
        private double maxTime;
        /// <summary>True while simulation is active.</summary>
        private bool simulationActive;
        /// <summary>Time in ns, when trigger condition is met.</summary>
        private double triggerTime;
        /// <summary>True, if the trigger condition had occured.</summary>
        private bool triggerOccured;

        /// <summary>Identifier for the source of this schematics.</summary>
        public SchematicsSource SchematicsSource;
        /// <summary>Name of this schematics.</summary>
        public readonly string Name;
        /// <summary>Full file name of the KiCAD netlist to import from.</summary>
        public string NetlistFileName;
        /// <summary>List of all elements of the schematics.</summary>
        public List<BaseElement> Elements;
        /// <summary>Event handler definition for progress events.</summary>
        public event ProgressEventHandler SimulationProgress;
        /// <summary>Instance of a basic logic low and high level.</summary>
        public readonly LogicLowHigh LogicLevel;
        /// <summary>Disassembler instance.</summary>
        public BaseDisassembler Disassembler;
        /// <summary>Can be set to true to abort the current simulation run.</summary>
        public bool AbortSimulation;
        /// <summary>List of all currently used trigger objects.</summary>
        public List<Trigger> Triggers;
        /// <summary>Enables or disables the trigger functions</summary>
        public bool EnableTrigger = false;
        /// <summary>Position of the trigger event.</summary>
        public double TriggerPosition = 1000;

        /// <summary>
        /// Creates the BaseSchematics instance.
        /// </summary>
        /// <param name="Name">Name of this schematics.</param>
        public BaseSchematics(string Name) : this(Name, "") { }

        /// <summary>
        /// Creates the BaseSchematics instance.
        /// </summary>
        /// <param name="Name">Name of this schematics.</param>
        /// <param name="NetlistFileName">Full file name of the KiCAD netlist to import from.</param>
        public BaseSchematics(string Name, string NetlistFileName)
        {
            netID = 0;
            this.Name = Name;
            this.NetlistFileName = NetlistFileName;
            Elements = new List<BaseElement>();
            LogicLevel = new LogicLowHigh();
            Disassembler = new BaseDisassembler();
            EnableTrigger = false;
            TriggerPosition = 1000;
            SimulationRestart();
        }

        /// <summary>
        /// Restore the internal fieldst once.
        /// </summary>
        /// <param name="TimeInterval">Time interval in ns.</param>
        /// <param name="MaxTime">Maximum simulation time in ns.</param>
        /// <param name="Time">Current time value to be used for the simulation in ns.</param>
        /// <param name="SimRunTime">Run time of the simulation in seconds.</param>
        /// <param name="TriggerTime">Time in ns, when trigger condition is met.</param>
        /// <param name="TriggerOccured">True, if the trigger condition had occured.</param>
        public void RestoreState(double TimeInterval, double MaxTime, double Time, double SimRunTime, double TriggerTime, bool TriggerOccured)
        {
            timeInterval= TimeInterval;
            maxTime = MaxTime;
            time = Time;
            simRunTime = SimRunTime;
            triggerTime = TriggerTime;
            triggerOccured = TriggerOccured;
        }


        /// <summary>
        /// Collects all net objects and returns a list object containing all Net objects
        /// </summary>
        /// <returns>List of Net objects of this schematics.</returns>
        public List<Net> GetNetList()
        {
            List<Net> netList = new List<Net>();
            foreach (BaseElement element in Elements)
            {
                foreach (Pin pin in element.Power)
                    if ((pin.ConnectedNet != null) && (netList.IndexOf(pin.ConnectedNet) < 0))
                        netList.Add(pin.ConnectedNet);

                foreach (Pin pin in element.Ground)
                    if ((pin.ConnectedNet != null) && (netList.IndexOf(pin.ConnectedNet) < 0))
                        netList.Add(pin.ConnectedNet);

                foreach (Pin pin in element.Passive)
                    if ((pin.ConnectedNet != null) && (netList.IndexOf(pin.ConnectedNet) < 0))
                        netList.Add(pin.ConnectedNet);

                for (int i = 0; i < element.Inputs.Length; i++)
                    foreach (Pin pin in element.Inputs[i])
                        if ((pin.ConnectedNet != null) && (netList.IndexOf(pin.ConnectedNet) < 0))
                            netList.Add(pin.ConnectedNet);

                for (int i = 0; i < element.Outputs.Length; i++)
                    foreach (Pin pin in element.Outputs[i])
                        if ((pin.ConnectedNet != null) && (netList.IndexOf(pin.ConnectedNet) < 0))
                            netList.Add(pin.ConnectedNet);
            }
            return netList;
        }


        /// <summary>
        /// A generic method to load a binary file into a ROM of a schematics.
        /// </summary>
        /// <param name="Idx">Index of the ROM.</param>
        /// <param name="FileName">Full file name of the binary to load into the ROM.</param>
        public virtual void LoadRomFile(int Idx, string FileName)
        {

        }

        /// <summary>
        /// A generic method to load a binary file into the ROM of a schematics.
        /// </summary>
        /// <param name="FileName">Full file name of the binary to load into the ROM.</param>
        public virtual void LoadRomFile(string FileName)
        {
            LoadRomFile(0, FileName);
        }

        /// <summary>
        /// A generic method to load a binary file into a RAM of a schematics.
        /// </summary>
        /// <param name="Idx">Index of the RAM.</param>
        /// <param name="FileName">Full file name of the binary to load into the RAM.</param>
        public virtual void LoadRamFile(int Idx, string FileName)
        {

        }

        /// <summary>
        /// A generic method to load a binary file into the RAM of a schematics.
        /// </summary>
        /// <param name="FileName">Full file name of the binary to load into the RAM.</param>
        public virtual void LoadRamFile(string FileName)
        {
            LoadRamFile(0, FileName);
        }

        /// <summary>
        /// Initialize the simulation of this schematics and all its elements.
        /// </summary>
        public virtual void SimulationRestart()
        {
            time = 0;
            triggerTime = double.MaxValue;
            triggerOccured = false;
            foreach (BaseElement be in Elements)
                be.SimulationRestart();
        }

        /// <summary>
        /// Perform one simulation step of the time interval.
        /// </summary>
        /// <param name="TimeInterval">Time interval in ns.</param>
        public void Step(double TimeInterval)
        {
            time += TimeInterval;
            foreach (BaseElement be in Elements)
                be.Update(time);

            if (EnableTrigger && (Triggers != null) && (Triggers.Count > 0) && (triggerOccured == false))
            {
                triggerOccured = false;
                Trigger.LogicOp lastLogic = Trigger.LogicOp.OR;
                foreach (Trigger trigger in Triggers)
                {
                    if (lastLogic == Trigger.LogicOp.OR)
                        triggerOccured |= trigger.CheckConditions();
                    else
                        triggerOccured &= trigger.CheckConditions();

                    lastLogic = trigger.Logic;
                }
                if (triggerOccured)
                    triggerTime = time;
            }
        }

        /// <summary>
        /// Simulate the current schematics from start to finish.
        /// </summary>
        /// <param name="TimeInterval">Time interval in ns.</param>
        /// <param name="MaxTime">Maximum simulation time in ns.</param>
        public void SimulateFromStart(double TimeInterval, double MaxTime)
        {
            AbortSimulation = false;
            simulationActive = true;
            this.timeInterval = TimeInterval;
            this.maxTime = MaxTime;
            SimulationRestart();

            string sActivity = "Simulation running (press ESC to abort)";
            if (SimulationProgress != null)
                SimulationProgress(this, new ProgressEventArgs(0, 100, sActivity, time));

            DateTime startTime = DateTime.Now;
            int cnt = 0;
            do
            {
                Step(TimeInterval);
                if ((++cnt > 250) && (SimulationProgress != null))
                {
                    SimulationProgress(this, new ProgressEventArgs((int)(100 * time / MaxTime), 100, sActivity, time));
                    cnt = 0;
                }
            }
            while ((time < MaxTime) && (!AbortSimulation));
            DateTime endTime = DateTime.Now;
            simRunTime = (endTime - startTime).TotalSeconds;

            if (SimulationProgress != null)
                SimulationProgress(this, new ProgressEventArgs(100, 100, "", time));
            simulationActive = false;
        }

        /// <summary>
        /// Continue simulation of the current schematics from last time to new maximum time.
        /// </summary>
        /// <param name="NewMaxTime">New maximum simulation time in ns.</param>
        public void ContinueSimulation(double NewMaxTime)
        {
            AbortSimulation = false;
            simulationActive = true;
            this.maxTime = NewMaxTime;

            string sActivity = "Continue Simulation (press ESC to abort)";
            if (SimulationProgress != null)
                SimulationProgress(this, new ProgressEventArgs(0, 100, sActivity, time));

            DateTime startTime = DateTime.Now;
            int cnt = 0;
            do
            {
                Step(TimeInterval);
                if ((++cnt > 250) && (SimulationProgress != null))
                {
                    SimulationProgress(this, new ProgressEventArgs((int)(100 * time / NewMaxTime), 100, sActivity, time));
                    cnt = 0;
                }
            }
            while ((time < MaxTime) && (!AbortSimulation));
            DateTime endTime = DateTime.Now;
            simRunTime += (endTime - startTime).TotalSeconds;

            if (SimulationProgress != null)
                SimulationProgress(this, new ProgressEventArgs(100, 100, "", time));
            simulationActive = false;
        }


        /// <summary>
        /// Shorten simulation history of the current schematics to new maximum time.
        /// </summary>
        /// <param name="NewMaxTime">New maximum simulation time in ns.</param>
        public void ShortenSimulation(double NewMaxTime)
        {
            this.maxTime = NewMaxTime;
            foreach (BaseElement element in Elements)
            {
                foreach (Pin pin in element.Power)
                    pin.History.Shorten(NewMaxTime);

                foreach (Pin pin in element.Ground)
                    pin.History.Shorten(NewMaxTime);

                foreach (Pin pin in element.Passive)
                    pin.History.Shorten(NewMaxTime);

                for (int i = 0; i < element.Inputs.Length; i++)
                    foreach (Pin pin in element.Inputs[i])
                        pin.History.Shorten(NewMaxTime);

                for (int i = 0; i < element.Outputs.Length; i++)
                    foreach (Pin pin in element.Outputs[i])
                        pin.History.Shorten(NewMaxTime);
            }
        }


        /// <summary>
        /// Searches the list of elements until the element with a matching name is found and returns that element.
        /// </summary>
        /// <param name="Name">Name of the element to find.</param>
        /// <returns>Reference to the element with the matching name or null if not found.</returns>
        public BaseElement GetElement(string Name)
        {
            if (LogicLevel.Name == Name)
                return LogicLevel;

            foreach (BaseElement be in Elements)
                if (be.Name == Name) return be;
            return null;
        }

        /// <summary>
        /// Remove the element and all its connections from the element list.
        /// </summary>
        /// <param name="element">Element to remove.</param>
        public void RemoveElement(BaseElement element)
        {
            if (element != null)
            {
                foreach (Pin pin in element.Power)
                    pin.ConnectedNet.ConnectedPins.Remove(pin);

                foreach (Pin pin in element.Ground)
                    pin.ConnectedNet.ConnectedPins.Remove(pin);

                foreach (Pin pin in element.Passive)
                    pin.ConnectedNet.ConnectedPins.Remove(pin);

                for (int i = 0; i < element.Inputs.Length; i++)
                    foreach (Pin pin in element.Inputs[i])
                        pin.ConnectedNet.ConnectedPins.Remove(pin);

                for (int i = 0; i < element.Outputs.Length; i++)
                    foreach (Pin pin in element.Outputs[i])
                        pin.ConnectedNet.ConnectedPins.Remove(pin);

                Elements.Remove(element);
            }
        }

        /// <summary>
        /// Gets the used time interval in ns.
        /// </summary>
        public double TimeInterval
        {
            get { return timeInterval; }
        }

        /// <summary>
        /// Gets the maximum simulation time in ns..
        /// </summary>
        public double MaxTime
        {
            get { return maxTime; }
        }


        /// <summary>
        /// Returns the internal time value.
        /// </summary>
        public double Time
        {
            get { return time; }
        }

        /// <summary>
        /// Returns the run time of the simulation in seconds.
        /// </summary>
        public double SimRunTime
        {
            get { return simRunTime; }
        }

        /// <summary>
        /// True while simulation is active.
        /// </summary>
        public bool SimulationActive
        {
            get { return simulationActive; }
        }

        /// <summary>
        /// Gets the time in ns, when trigger condition is met.
        /// </summary>
        public double TriggerTime
        {
            get { return triggerTime; }
        }

        /// <summary>
        /// Returns true, if the trigger condition had occured.
        /// </summary>
        public bool TriggerOccured
        {
            get { return triggerOccured; }
        }

        /// <summary>
        /// Gets the netID counter and increments that counter afterwards.
        /// </summary>
        public int NextNetID
        {
            get { return netID++; }
        }
    }
}
