// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Diagnostics;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT193.
    /// </summary>
    public class HCT193 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hct193.pdf

        private const double TYP_PROPAGATION_DELAY = 25;

        #region Private/Protected Fields
        protected int counter;
        private SignalState lastPLn;
        private SignalState lastCPU;
        private SignalState lastCPD;
        #endregion Private/Protected Fields

        #region Input Pins
        public Pin MR;
        public Pin CPU;
        public Pin CPD;
        public Pin PLn;
        public Pin P0;
        public Pin P1;
        public Pin P2;
        public Pin P3;
        #endregion Input Pins

        #region Output Pins
        public Pin Q0;
        public Pin Q1;
        public Pin Q2;
        public Pin Q3;
        public Pin TCU;
        public Pin TCD;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT193(string Name) : this(Name, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT193(string Name, Net NetMR, Net NetCPU, Net NetCPD, Net NetPLn, Net NetP0, Net NetP1, Net NetP2, Net NetP3) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.MR = new Pin(this, "MR", "14", LineMode.In, SignalState.L, NetMR);
            this.CPU = new Pin(this, "CPU", "5", LineMode.In, SignalState.L, NetCPU);
            this.CPD = new Pin(this, "CPD", "4", LineMode.In, SignalState.L, NetCPD);
            this.PLn = new Pin(this, "PLn", "11", LineMode.In, SignalState.L, NetPLn);
            this.P0 = new Pin(this, "P0", "15", LineMode.In, SignalState.L, NetP0);
            this.P1 = new Pin(this, "P1", "1", LineMode.In, SignalState.L, NetP1);
            this.P2 = new Pin(this, "P2", "10", LineMode.In, SignalState.L, NetP2);
            this.P3 = new Pin(this, "P3", "9", LineMode.In, SignalState.L, NetP3);

            this.TCU = new Pin(this, "TCU", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.TCD = new Pin(this, "TCD", "13", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q0 = new Pin(this, "Q0", "3", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q1 = new Pin(this, "Q1", "2", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q2 = new Pin(this, "Q2", "6", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q3 = new Pin(this, "Q3", "7", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[5][];
            SetPinArray(Inputs, 0, this.MR);
            SetPinArray(Inputs, 1, this.CPU);
            SetPinArray(Inputs, 2, this.CPD);
            SetPinArray(Inputs, 3, this.PLn);
            SetPinArray(Inputs, 4, new Pin[] { this.P0, this.P1, this.P2, this.P3 });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, new Pin[] { this.TCU, this.TCD });
            SetPinArray(Outputs, 1, new Pin[] { this.Q0, this.Q1, this.Q2, this.Q3 });

            SimulationRestart();
        }
        #endregion Constructors

        #region Private/Protected Methods
        /// <summary>
        /// Set the NewOutStates from the counter value.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        private void SetNewStates(double Time)
        {
            Q0.NewOutState = ((counter & 1) != 0) ? SignalState.H : SignalState.L;
            Q1.NewOutState = ((counter & 2) != 0) ? SignalState.H : SignalState.L;
            Q2.NewOutState = ((counter & 4) != 0) ? SignalState.H : SignalState.L;
            Q3.NewOutState = ((counter & 8) != 0) ? SignalState.H : SignalState.L;

#if DEBUG_WRITE
				Debug.WriteLine("Time="+Time.ToString()+",HCT193, load, counter=" + counter.ToString());
#endif
            SetOutputChangeTime(Time);
        }

        /// <summary>
        /// Convert the input port pin states into the counter value.
        /// </summary>
        private void GetInputValue()
        {
            counter = 0;
            if (P0.State == SignalState.H)
                counter |= 1;
            if (P1.State == SignalState.H)
                counter |= 2;
            if (P2.State == SignalState.H)
                counter |= 4;
            if (P3.State == SignalState.H)
                counter |= 8;
        }
        #endregion Private/Protected Methods

        #region Public Methods
        /// <summary>
        /// Restart the chip.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            counter = 0;
            lastPLn = SignalState.H;
            lastCPU = SignalState.L;
            lastCPD = SignalState.L;
            SetOutputStates(SignalState.L);
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            if (MR.State == SignalState.H)
            {
                counter = 0;
                SetNewStates(Time);
            }
            else if (PLn.State == SignalState.L)
            {
                if (lastPLn == SignalState.H)
                {
                    GetInputValue();
                    SetNewStates(Time);
                }
            }
            else if ((CPU.State == SignalState.H) && (lastCPU == SignalState.L) && (CPD.State == SignalState.H))
            {
                counter = (counter +1) & 0xF;
                SetNewStates(Time);
            }
            else if ((CPD.State == SignalState.H) && (lastCPD == SignalState.L) && (CPU.State == SignalState.H))
            {
                counter = (counter - 1) & 0xF;
                SetNewStates(Time);
            }

            if ((counter == 15) && (CPU.State == SignalState.L))
                TCU.NewOutState = SignalState.L;
            else
                TCU.NewOutState = SignalState.H;

            if ((counter == 0) && (CPD.State == SignalState.L))
                TCD.NewOutState = SignalState.L;
            else
                TCD.NewOutState = SignalState.H;

            lastPLn = PLn.State;
            lastCPU = CPU.State;
            lastCPD = CPD.State;
        }
        #endregion Public Methods

    }
}
