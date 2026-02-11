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
    /// Class definition of the logic chip 74HCT161.
    /// </summary>
    public class HCT161 : ClockedChip
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hct161.pdf

        private const double TYP_PROPAGATION_DELAY = 15;

        #region Private/Protected Fields
        protected int counter;
        #endregion Private/Protected Fields

        #region Input Pins
        public Pin SPEn;
        public Pin PE;
        public Pin TE;
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
        public Pin TC;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT161(string Name) : this(Name, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT161(string Name, Net NetCp, Net NetMRn, Net NetSPEn, Net NetPE, Net NetTE, Net NetP0, Net NetP1, Net NetP2, Net NetP3) : base(Name, "Cp", "2", NetCp, "MRn", "1", NetMRn)
        {
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.SPEn = new Pin(this, "SPEn", "9", LineMode.In, SignalState.L, NetSPEn);
            this.PE = new Pin(this, "PE", "7", LineMode.In, SignalState.L, NetPE);
            this.TE = new Pin(this, "TE", "10", LineMode.In, SignalState.L, NetTE);
            this.P0 = new Pin(this, "P0", "3", LineMode.In, SignalState.L, NetP0);
            this.P1 = new Pin(this, "P1", "4", LineMode.In, SignalState.L, NetP1);
            this.P2 = new Pin(this, "P2", "5", LineMode.In, SignalState.L, NetP2);
            this.P3 = new Pin(this, "P3", "6", LineMode.In, SignalState.L, NetP3);

            this.TC = new Pin(this, "TC", "15", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY + 10);
            this.Q0 = new Pin(this, "Q0", "14", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q1 = new Pin(this, "Q1", "13", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q2 = new Pin(this, "Q2", "12", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.Q3 = new Pin(this, "Q3", "11", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[6][];
            SetPinArray(Inputs, 0, this.CLK);
            SetPinArray(Inputs, 1, this.RST);
            SetPinArray(Inputs, 2, this.SPEn);
            SetPinArray(Inputs, 3, this.PE);
            SetPinArray(Inputs, 4, this.TE);
            SetPinArray(Inputs, 5, new Pin[] { this.P0, this.P1, this.P2, this.P3 });
            //DatabusIn = new Pin[1][];
            //SetPinArray(DatabusIn, 0, new Pin[] { this.P0, this.P1, this.P2, this.P3 });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, this.TC);
            SetPinArray(Outputs, 1, new Pin[] { this.Q0, this.Q1, this.Q2, this.Q3 });
            //DatabusOut = new Pin[1][];
            //SetPinArray(DatabusOut, 0, new Pin[] { this.Q0, this.Q1, this.Q2, this.Q3 });
            ResetChip();
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
            SetOutputChangeTime(Time);
        }

        /// <summary>
        /// Reset the counter and the chip state.
        /// </summary>
        protected override void ResetChip()
        {
            base.ResetChip();
            counter = 0;
            //SetOutputStates(SignalState.L);
            SetNewOutputStates(1, SignalState.L);
        }

        /// <summary>
        /// Called on the rising edge of the clock to count or load.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected override void RisingEdge(double Time)
        {
            //if ((Name == "U48") && (Time >= 10855))
            //    Debug.WriteLine("");

            if (SPEn.State == SignalState.L)
            {
                counter = 0;
                if (P0.State == SignalState.H)
                    counter += 1;
                if (P1.State == SignalState.H)
                    counter += 2;
                if (P2.State == SignalState.H)
                    counter += 4;
                if (P3.State == SignalState.H)
                    counter += 8;
#if DEBUG_WRITE
				Debug.WriteLine("Time="+Time.ToString()+",HCT161, load, counter=" + counter.ToString());
#endif
                SetNewStates(Time);
            }
            else if ((PE.State == SignalState.H) && (TE.State == SignalState.H) && (SPEn.State == SignalState.H))
            {
                counter = (counter + 1) & 0xF;
#if DEBUG_WRITE
				Debug.WriteLine("Time=" + Time.ToString() + ",HCT161, count, counter=" + counter.ToString());
#endif
                SetNewStates(Time);
            }
        }
        #endregion Private/Protected Methods

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            //if ((Name == "U48") && (Time >= 10855))
            //    Debug.WriteLine("");

            base.Update(Time);

            if ((PE.State == SignalState.H) && (TE.State == SignalState.H) && (SPEn.State == SignalState.H) && ((counter & 0xF) == 0xF))
                TC.NewOutState = SignalState.H;
            else
                TC.NewOutState = SignalState.L;

        }
        #endregion Public Methods

    }
}
